const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL and Anon Key must be provided');
}

// Supabase REST API ヘルパー
export const supabaseApi = {
  async fetchStoryArcs() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/story_arcs?select=*&order=order_num.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch story arcs');
    }
    
    return await response.json();
  },

  async fetchUserProgress() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user progress');
    }
    
    return await response.json();
  }
};

// 型定義
export interface StoryArc {
  id: number;
  name: string;
  display_name: string;
  emoji: string;
  order_num: number;
  volume_start: number;
  volume_end: number | null;
  target_questions: number;
  unlock_threshold: number;
  unlock_condition: string | null;
  description: string | null;
  background_color: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  reference_vol: string;
  reference_ch: number;
  difficulty: 'S' | 'A' | 'B' | 'C';
  category: string;
  story_arc_id: number;
  is_cross_arc: boolean;
  related_arcs: string[] | null;
  has_image: boolean;
  image_paths: string[] | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  ai_generated: boolean;
  ai_source: string | null;
  verification_notes: string | null;
  question_type: string | null;
  question_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: number;
  story_arc_id: number;
  total_questions: number;
  correct_answers: number;
  completion_rate: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  stars: number;
  created_at: string;
  updated_at: string;
}