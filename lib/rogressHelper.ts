import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * ユーザーの進捗を更新する（100%上限付き）
 */
export async function updateUserProgress(
  userId: string,
  storyArcId: number,
  isCorrect: boolean
) {
  try {
    // 現在の進捗を取得
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('story_arc_id', storyArcId)
      .single();

    if (!currentProgress) {
      console.error('Progress not found');
      return;
    }

    // エリアの総問題数を取得
    const { data: arc } = await supabase
      .from('story_arcs')
      .select('total_questions')
      .eq('id', storyArcId)
      .single();

    if (!arc) {
      console.error('Arc not found');
      return;
    }

    const totalQuestions = arc.total_questions || 10;

    // 新しい値を計算
    const newTotalQuestions = currentProgress.total_questions + 1;
    const newCorrectAnswers = currentProgress.correct_answers + (isCorrect ? 1 : 0);
    
    // 進捗率を計算（100%上限）
    let completionRate = (newCorrectAnswers / totalQuestions) * 100;
    completionRate = Math.min(100, completionRate); // 100%上限

    // 星の数を計算
    let stars = 0;
    if (completionRate >= 100) stars = 3;
    else if (completionRate >= 70) stars = 2;
    else if (completionRate >= 40) stars = 1;

    // 進捗を更新
    const { error } = await supabase
      .from('user_progress')
      .update({
        total_questions: newTotalQuestions,
        correct_answers: newCorrectAnswers,
        completion_rate: Math.round(completionRate),
        stars: stars,
        questions_remaining: Math.max(0, totalQuestions - newCorrectAnswers),
      })
      .eq('user_id', userId)
      .eq('story_arc_id', storyArcId);

    if (error) {
      console.error('Progress update error:', error);
      throw error;
    }

    console.log('Progress updated:', {
      completionRate: Math.round(completionRate),
      stars,
      correct: newCorrectAnswers,
      total: totalQuestions,
    });

    return {
      completionRate: Math.round(completionRate),
      stars,
    };
  } catch (error) {
    console.error('Failed to update progress:', error);
    throw error;
  }
}