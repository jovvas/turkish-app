export type Book = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  storage_path: string;
  total_pages: number | null;
  cover_color: string | null;
  sort_order: number | null;
};

export type Point = { x: number; y: number }; // normalised 0..1 relative to page

export type Stroke = {
  tool: "pen" | "highlighter";
  color: string;
  size: number; // normalised to page width
  points: Point[];
};

export type TextNote = {
  x: number; // normalised 0..1
  y: number;
  text: string;
  color: string;
  size: number; // normalised to page width
};

export type PageAnnotation = {
  strokes: Stroke[];
  texts: TextNote[];
};

export type Bookmark = {
  id: string;
  book_id: string;
  page: number;
  label: string | null;
  created_at: string;
};

export type ReadingState = {
  book_id: string;
  last_page: number;
};

export type DictionaryEntry = {
  id: string;
  turkish: string;
  meaning: string;
  notes: string | null;
  example: string | null;
  book_id: string | null;
  page: number | null;
  learned: boolean;
  created_at: string;
};
