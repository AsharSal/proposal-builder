export interface QuestionItem {
  title: string;
  content: string;
}

export interface Question {
  id: string;
  title: string;
  items: QuestionItem[];
  createdAt: string;
}