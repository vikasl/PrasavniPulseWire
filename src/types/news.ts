export type NewsCategory =
  | 'general'
  | 'world'
  | 'business'
  | 'technology'
  | 'health'
  | 'science'
  | 'sports';

export type Article = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  category: NewsCategory;
  url: string;
};

