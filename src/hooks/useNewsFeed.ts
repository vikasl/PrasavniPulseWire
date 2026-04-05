import { useEffect, useState } from 'react';
import { fetchTopHeadlines } from '../services/newsApi';
import { Article, NewsCategory } from '../types/news';

export function useNewsFeed(initialCategory: NewsCategory) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeCategory, setActiveCategory] = useState<NewsCategory>(initialCategory);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('Loading source...');

  async function load(category: NewsCategory, refresh = false) {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextFeed = await fetchTopHeadlines(category);
      setArticles(nextFeed.articles);
      setSourceLabel(nextFeed.sourceLabel);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    load(activeCategory);
  }, [activeCategory]);

  return {
    articles,
    activeCategory,
    isLoading,
    isRefreshing,
    sourceLabel,
    setActiveCategory,
    refresh: () => load(activeCategory, true),
  };
}
