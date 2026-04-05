import { Article } from '../types/news';

export const mockArticles: Article[] = [
  {
    id: 'mock-1',
    title: 'How modern cities are redesigning public spaces for slower, calmer streets',
    description:
      'Urban planners are borrowing ideas from pedestrian-first districts to make downtown corridors quieter, greener, and easier to navigate.',
    imageUrl:
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
    source: 'City Ledger',
    publishedAt: new Date().toISOString(),
    category: 'world',
    url: 'https://example.com/story-1',
  },
  {
    id: 'mock-2',
    title: 'A new generation of chips is pushing practical AI onto smaller devices',
    description:
      'Designers are trading brute force for efficiency, enabling on-device assistants and faster private inference at the edge.',
    imageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    source: 'Tech Review',
    publishedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    category: 'technology',
    url: 'https://example.com/story-2',
  },
  {
    id: 'mock-3',
    title: 'The comeback of neighborhood bookstores is being powered by curated events',
    description:
      'Independent sellers are winning readers back with intimate clubs, author nights, and design-forward storefronts.',
    imageUrl:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
    source: 'Weekend Journal',
    publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    category: 'general',
    url: 'https://example.com/story-3',
  },
  {
    id: 'mock-4',
    title: 'Why more health startups are focusing on prevention instead of treatment',
    description:
      'From sleep to nutrition, a wave of products is betting that better habits will outperform reactive care.',
    imageUrl:
      'https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=1200&q=80',
    source: 'Health Forward',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    category: 'health',
    url: 'https://example.com/story-4',
  },
  {
    id: 'mock-5',
    title: 'Scientists are mapping coral resilience to identify reefs most likely to recover',
    description:
      'New modeling work may help direct restoration funds to ecosystems with the strongest odds of long-term survival.',
    imageUrl:
      'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80',
    source: 'Science Desk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    category: 'science',
    url: 'https://example.com/story-5',
  },
];

