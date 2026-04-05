export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content?: string;
  category: string;
  imageUrl: string;
  createdAt: string;
  views?: number;
}

export interface VideoArticle {
  id: string;
  title: string;
  videoUrl: string;
  duration?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  createdAt: string;
  views?: number;
}
