// Supabase型定義

export interface StoryArc {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  emoji: string | null;
  volume_start: number | null;
  volume_end: number | null;
  total_questions: number;
  target_questions: number;
  unlock_threshold: number;
  unlock_condition: string | null;
  order_num: number;
  background_color: string;
  created_at: string;
}

export interface UserProgress {
  id: number;
  user_id: string;
  story_arc_id: number;
  total_questions: number;
  correct_answers: number;
  completion_rate: number;
  stars: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  total_berries: number;
  level: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// 新規追加: 問題関連の型定義
export interface Question {
  id: number;
  story_arc_id: number;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Choice {
  id: number;
  question_id: number;
  choice_text: string;
  is_correct: boolean;
  order_num: number;
  created_at: string;
}

// 問題と選択肢をまとめた型（クイズ表示用）
export interface QuestionWithChoices extends Question {
  choices: Choice[];
  story_arc?: StoryArc;
}