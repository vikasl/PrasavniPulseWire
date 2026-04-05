const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const provider = (process.env.NEWS_PROVIDER || 'spaceflight').toLowerCase();
const newsApiKey = process.env.NEWS_API_KEY || '';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 120);
const cacheTtlMs = Number(process.env.CACHE_TTL_MS || 300_000);
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 8_000);
const trustProxy = process.env.TRUST_PROXY || '1';
const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
const allowedProviders = ['spaceflight', 'gnews', 'thenewsapi'];
const categoryList = ['general', 'world', 'business', 'technology', 'health', 'science', 'sports'];
const responseCache = new Map();
const providerCategoryMap = {
  spaceflight: {
    general: 'general',
    world: 'world',
    business: 'business',
    technology: 'technology',
    health: 'health',
    science: 'science',
    sports: 'sports',
  },
  gnews: {
    general: 'general',
    world: 'world',
    business: 'business',
    technology: 'technology',
    health: 'health',
    science: 'science',
    sports: 'sports',
  },
  thenewsapi: {
    general: 'general',
    world: 'politics',
    business: 'business',
    technology: 'tech',
    health: 'health',
    science: 'science',
    sports: 'sports',
  },
};

const mockArticles = [
  {
    id: 'server-mock-1',
    title: 'How local-first publishing is reshaping the way readers discover daily coverage',
    description:
      'Independent outlets are leaning into tighter editorial voice, clearer curation, and design systems that make headlines feel premium again.',
    imageUrl:
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
    source: 'PulseWire Desk',
    publishedAt: new Date().toISOString(),
    category: 'general',
    url: 'https://example.com/mock-1',
  },
  {
    id: 'server-mock-2',
    title: 'A calmer approach to product news is winning over readers fatigued by endless feeds',
    description:
      'Apps that focus on rhythm, hierarchy, and useful summaries are seeing stronger engagement than pure notification-first products.',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    source: 'Design Weekly',
    publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    category: 'technology',
    url: 'https://example.com/mock-2',
  },
];

if (!allowedProviders.includes(provider)) {
  throw new Error(`Unsupported NEWS_PROVIDER "${provider}". Use one of: ${allowedProviders.join(', ')}`);
}

if (!Number.isFinite(port) || port <= 0) {
  throw new Error('PORT must be a positive number.');
}

if (!Number.isFinite(rateLimitWindowMs) || !Number.isFinite(rateLimitMax)) {
  throw new Error('RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX must be numeric.');
}

if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) {
  throw new Error('CACHE_TTL_MS must be zero or a positive number.');
}

if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1000) {
  throw new Error('REQUEST_TIMEOUT_MS must be at least 1000.');
}

app.disable('x-powered-by');
app.set('trust proxy', trustProxy);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    hsts: false,
  }),
);
app.use(
  rateLimit({
    windowMs: rateLimitWindowMs,
    limit: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests, please slow down.',
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '64kb' }));

function log(level, message, extra) {
  if (logLevel === 'silent') {
    return;
  }

  const shouldLogDebug = logLevel === 'debug';
  if (level === 'debug' && !shouldLogDebug) {
    return;
  }

  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[${level}] ${message}${payload}`);
}

function normalizeCategory(category, fallback) {
  return categoryList.includes(category) ? category : fallback;
}

function resolveProviderCategory(category) {
  return providerCategoryMap[provider]?.[category] || category;
}

function getProviderLabel() {
  if (provider === 'gnews' && newsApiKey) {
    return 'Live via Synology API (GNews)';
  }

  if (provider === 'thenewsapi' && newsApiKey) {
    return 'Live via Synology API (TheNewsAPI)';
  }

  return 'Live via Synology API';
}

function buildProviderUrl(category) {
  const providerCategory = resolveProviderCategory(category);

  if (provider === 'gnews' && newsApiKey) {
    const params = [
      'country=us',
      'lang=en',
      'max=20',
      `category=${encodeURIComponent(providerCategory)}`,
      `apikey=${encodeURIComponent(newsApiKey)}`,
    ];
    return `https://gnews.io/api/v4/top-headlines?${params.join('&')}`;
  }

  if (provider === 'thenewsapi' && newsApiKey) {
    const params = [
      `api_token=${encodeURIComponent(newsApiKey)}`,
      'locale=us',
      'language=en',
      'limit=20',
      `categories=${encodeURIComponent(providerCategory)}`,
    ];
    return `https://api.thenewsapi.com/v1/news/top?${params.join('&')}`;
  }

  return 'https://api.spaceflightnewsapi.net/v4/articles/?limit=20&ordering=-published_at';
}

function mapGNewsArticle(item, fallbackCategory) {
  return {
    id: item.url || `${Date.now()}-${Math.random()}`,
    title: item.title || 'Untitled story',
    description: item.description || 'No description available.',
    imageUrl: item.image || FALLBACK_IMAGE,
    source: item.source?.name || 'GNews',
    publishedAt: item.publishedAt || new Date().toISOString(),
    category: normalizeCategory(item.category, fallbackCategory),
    url: item.url || 'https://gnews.io',
  };
}

function mapSpaceflightArticle(item, fallbackCategory) {
  return {
    id: String(item.id),
    title: item.title || 'Untitled story',
    description: item.summary || 'No description available.',
    imageUrl: item.image_url || FALLBACK_IMAGE,
    source: item.news_site || 'Spaceflight News',
    publishedAt: item.published_at || new Date().toISOString(),
    category: fallbackCategory,
    url: item.url || 'https://api.spaceflightnewsapi.net',
  };
}

function mapTheNewsApiArticle(item, fallbackCategory) {
  return {
    id: item.uuid || item.url || `${Date.now()}-${Math.random()}`,
    title: item.title || 'Untitled story',
    description: item.description || 'No description available.',
    imageUrl: item.image_url || FALLBACK_IMAGE,
    source: item.source || 'TheNewsAPI',
    publishedAt: item.published_at || new Date().toISOString(),
    category: fallbackCategory,
    url: item.url || 'https://www.thenewsapi.com',
  };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  let response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'PulseWire/1.0 (+https://pulsewire.local)',
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  return response.json();
}

function getCachedArticles(category) {
  const cached = responseCache.get(category);
  if (!cached) {
    return undefined;
  }

  if (Date.now() > cached.expiresAt) {
    responseCache.delete(category);
    return undefined;
  }

  return cached.value;
}

function setCachedArticles(category, articles) {
  if (cacheTtlMs === 0) {
    return;
  }

  responseCache.set(category, {
    value: articles,
    expiresAt: Date.now() + cacheTtlMs,
  });
}

async function getArticles(category) {
  const cached = getCachedArticles(category);
  if (cached) {
    return cached;
  }

  try {
    const payload = await fetchJson(buildProviderUrl(category));
    let articles;

    if (provider === 'gnews' && newsApiKey) {
      articles = (payload.articles || []).map((item) => mapGNewsArticle(item, category));
    } else if (provider === 'thenewsapi' && newsApiKey) {
      articles = (payload.data || []).map((item) => mapTheNewsApiArticle(item, category));
    } else {
      articles = (payload.results || []).map((item) => mapSpaceflightArticle(item, category));
    }

    setCachedArticles(category, articles);
    return articles;
  } catch (error) {
    log('error', 'Upstream fetch failed, serving fallback content.', {
      provider,
      category,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    const matching = mockArticles.filter(
      (article) => article.category === category || category === 'general',
    );
    return matching.length > 0 ? matching : mockArticles;
  }
}

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    provider:
      (provider === 'gnews' || provider === 'thenewsapi') && newsApiKey ? provider : 'spaceflight',
    timestamp: new Date().toISOString(),
    cacheEntries: responseCache.size,
  });
});

app.get('/ready', (_request, response) => {
  response.json({
    status: 'ready',
    provider:
      (provider === 'gnews' || provider === 'thenewsapi') && newsApiKey ? provider : 'spaceflight',
  });
});

app.get('/api/meta', (_request, response) => {
  response.json({
    sourceLabel: getProviderLabel(),
    provider:
      (provider === 'gnews' || provider === 'thenewsapi') && newsApiKey ? provider : 'spaceflight',
    categories: categoryList,
  });
});

app.get('/api/news', async (request, response) => {
  const category = normalizeCategory(String(request.query.category || 'general'), 'general');
  const articles = await getArticles(category);

  response.json({
    sourceLabel: getProviderLabel(),
    provider:
      (provider === 'gnews' || provider === 'thenewsapi') && newsApiKey ? provider : 'spaceflight',
    category,
    articles,
  });
});

app.use((error, _request, response, _next) => {
  log('error', 'Unhandled request error.', {
    reason: error instanceof Error ? error.message : 'unknown',
  });
  response.status(500).json({
    error: 'Internal server error',
  });
});

app.listen(port, () => {
  log('info', `PulseWire backend listening on port ${port}`, {
    provider,
    trustProxy,
    rateLimitWindowMs,
    rateLimitMax,
    cacheTtlMs,
  });
});
