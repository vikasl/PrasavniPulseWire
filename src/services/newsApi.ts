import { Platform } from 'react-native';
import { mockArticles } from '../data/mockArticles';
import { Article, NewsCategory } from '../types/news';

declare const process: {
  env: Record<string, string | undefined>;
};

type NewsResponse = {
  sourceLabel?: string;
  provider?: string;
  category?: string;
  articles?: Article[];
};

type BulkNewsResponse = {
  sourceLabel?: string;
  provider?: string;
  categories?: Partial<Record<NewsCategory, NewsResponse>>;
};

const FALLBACK_SOURCE_LABEL = 'Local fallback feed';
const mode = (process.env.EXPO_PUBLIC_NEWS_API_MODE || 'spaceflight').toLowerCase();
const apiKey = process.env.EXPO_PUBLIC_NEWS_API_KEY;
const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const bulkCategoryCache = new Map<NewsCategory, Article[]>();
let bulkSourceLabelCache: string | undefined;
const providerCategoryMap = {
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
} as const;

function getWebOrigin() {
  if (Platform.OS !== 'web') {
    return undefined;
  }

  if (typeof window === 'undefined' || !window.location?.origin) {
    return undefined;
  }

  return window.location.origin;
}

function getApiBaseUrl() {
  if (explicitApiBaseUrl) {
    return explicitApiBaseUrl.replace(/\/$/, '');
  }

  const webOrigin = getWebOrigin();
  if (webOrigin) {
    return `${webOrigin}/api`;
  }

  return undefined;
}

function isStaticWebRender() {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

function resolveProviderCategory(provider: 'gnews' | 'thenewsapi', category: NewsCategory) {
  return providerCategoryMap[provider][category];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function buildDirectGNewsUrl(category: NewsCategory) {
  const providerCategory = resolveProviderCategory('gnews', category);
  const baseParams = [
    'country=us',
    'lang=en',
    'max=20',
    `category=${encodeURIComponent(providerCategory)}`,
  ];

  if (apiKey) {
    baseParams.push(`apikey=${encodeURIComponent(apiKey)}`);
  }

  return `https://gnews.io/api/v4/top-headlines?${baseParams.join('&')}`;
}

function buildDirectTheNewsApiUrl(category: NewsCategory) {
  const providerCategory = resolveProviderCategory('thenewsapi', category);
  const baseParams = [
    `api_token=${encodeURIComponent(apiKey || '')}`,
    'locale=us',
    'language=en',
    'limit=20',
    `categories=${encodeURIComponent(providerCategory)}`,
  ];

  return `https://api.thenewsapi.com/v1/news/top?${baseParams.join('&')}`;
}

function buildDirectSpaceflightUrl() {
  return 'https://api.spaceflightnewsapi.net/v4/articles/?limit=20&ordering=-published_at';
}

function normalizeCategory(category: string | undefined, fallback: NewsCategory): NewsCategory {
  const knownCategories: NewsCategory[] = [
    'general',
    'world',
    'business',
    'technology',
    'health',
    'science',
    'sports',
  ];

  return knownCategories.includes((category || '') as NewsCategory)
    ? ((category as NewsCategory) || fallback)
    : fallback;
}

function normalizeGNewsArticle(item: any, fallbackCategory: NewsCategory): Article {
  return {
    id: item.url,
    title: item.title || 'Untitled story',
    description: item.description || 'No description available.',
    imageUrl: item.image || mockArticles[0].imageUrl,
    source: item.source?.name || 'GNews',
    publishedAt: item.publishedAt || new Date().toISOString(),
    category: normalizeCategory(item.category, fallbackCategory),
    url: item.url || 'https://gnews.io',
  };
}

function normalizeSpaceflightArticle(item: any, fallbackCategory: NewsCategory): Article {
  return {
    id: String(item.id),
    title: item.title || 'Untitled story',
    description: item.summary || 'No description available.',
    imageUrl: item.image_url || mockArticles[0].imageUrl,
    source: item.news_site || 'Spaceflight News',
    publishedAt: item.published_at || new Date().toISOString(),
    category: fallbackCategory,
    url: item.url || 'https://api.spaceflightnewsapi.net',
  };
}

function normalizeTheNewsApiArticle(item: any, fallbackCategory: NewsCategory): Article {
  return {
    id: item.uuid || item.url || `${Date.now()}-${Math.random()}`,
    title: item.title || 'Untitled story',
    description: item.description || 'No description available.',
    imageUrl: item.image_url || mockArticles[0].imageUrl,
    source: item.source || 'TheNewsAPI',
    publishedAt: item.published_at || new Date().toISOString(),
    category: fallbackCategory,
    url: item.url || 'https://www.thenewsapi.com',
  };
}

async function fetchFromBackend(category: NewsCategory): Promise<NewsResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Backend API base URL is not configured.');
  }

  return fetchJson<NewsResponse>(`${apiBaseUrl}/news?category=${encodeURIComponent(category)}`);
}

async function fetchAllFromBackend(): Promise<BulkNewsResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Backend API base URL is not configured.');
  }

  return fetchJson<BulkNewsResponse>(`${apiBaseUrl}/news/all`);
}

async function fetchDirect(category: NewsCategory): Promise<NewsResponse> {
  if (mode === 'gnews' && apiKey) {
    const payload = await fetchJson<any>(buildDirectGNewsUrl(category));
    return {
      sourceLabel: 'Live via GNews',
      provider: 'gnews',
      category,
      articles: (payload.articles || []).map((item: any) => normalizeGNewsArticle(item, category)),
    };
  }

  if (mode === 'thenewsapi' && apiKey) {
    const payload = await fetchJson<any>(buildDirectTheNewsApiUrl(category));
    return {
      sourceLabel: 'Live via TheNewsAPI',
      provider: 'thenewsapi',
      category,
      articles: (payload.data || []).map((item: any) => normalizeTheNewsApiArticle(item, category)),
    };
  }

  const payload = await fetchJson<any>(buildDirectSpaceflightUrl());
  return {
    sourceLabel: 'Live via Spaceflight',
    provider: 'spaceflight',
    category,
    articles: (payload.results || []).map((item: any) => normalizeSpaceflightArticle(item, category)),
  };
}

function getFallbackArticles(category: NewsCategory) {
  const filteredArticles = mockArticles.filter(
    (article) => article.category === category || category === 'general',
  );
  return filteredArticles.length > 0 ? filteredArticles : mockArticles;
}

function hydrateBulkCache(payload: BulkNewsResponse) {
  if (!payload.categories) {
    return;
  }

  for (const [category, feed] of Object.entries(payload.categories)) {
    const key = category as NewsCategory;
    bulkCategoryCache.set(key, feed?.articles || getFallbackArticles(key));
  }

  bulkSourceLabelCache = payload.sourceLabel || 'Live via backend API';
}

export function getCachedCategoryArticles(category: NewsCategory) {
  return bulkCategoryCache.get(category);
}

export async function fetchTopHeadlines(category: NewsCategory): Promise<{
  articles: Article[];
  sourceLabel: string;
}> {
  if (isStaticWebRender()) {
    return {
      articles: getFallbackArticles(category),
      sourceLabel: 'Static preview feed',
    };
  }

  try {
    if (bulkCategoryCache.has(category) && bulkSourceLabelCache) {
      return {
        articles: bulkCategoryCache.get(category) || getFallbackArticles(category),
        sourceLabel: bulkSourceLabelCache,
      };
    }

    const bulkResponse = await fetchAllFromBackend();
    hydrateBulkCache(bulkResponse);

    if (bulkCategoryCache.has(category)) {
      return {
        articles: bulkCategoryCache.get(category) || getFallbackArticles(category),
        sourceLabel: bulkSourceLabelCache || 'Live via backend API',
      };
    }

    const backendResponse = await fetchFromBackend(category);
    return {
      articles: backendResponse.articles || getFallbackArticles(category),
      sourceLabel: backendResponse.sourceLabel || 'Live via backend API',
    };
  } catch {
    try {
      const directResponse = await fetchDirect(category);
      return {
        articles: directResponse.articles || getFallbackArticles(category),
        sourceLabel: directResponse.sourceLabel || FALLBACK_SOURCE_LABEL,
      };
    } catch {
      return {
        articles: getFallbackArticles(category),
        sourceLabel: FALLBACK_SOURCE_LABEL,
      };
    }
  }
}
