'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Choice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  order_num: number;
}

interface Question {
  id: number;
  question_text: string;
  difficulty: string;
  points: number;
  explanation: string | null;
  choices: Choice[];
}

interface QuizGameProps {
  arcId: number;
}

export default function QuizGame({ arcId }: QuizGameProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [arcName, setArcName] = useState('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem('supabase_user');
      if (userStr && userStr !== 'undefined') {
        const user = JSON.parse(userStr);
        setUserId(user.id);
      }
    };

    const loadQuestions = async () => {
      try {
        // エリア情報を取得
        const { data: arc } = await supabase
          .from('story_arcs')
          .select('display_name')
          .eq('id', arcId)
          .single();

        if (arc) {
          setArcName(arc.display_name);
        }

        // 問題を取得
        const { data: questionsData } = await supabase
          .from('questions')
          .select(`
            id,
            question_text,
            difficulty,
            points,
            explanation,
            choices (
              id,
              choice_text,
              is_correct,
              order_num
            )
          `)
          .eq('story_arc_id', arcId);

        if (questionsData && questionsData.length > 0) {
          // シャッフル
          const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
          setQuestions(shuffled as Question[]);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
    loadUser();
  }, [arcId]);

  const handleChoiceClick = (choiceId: number) => {
    if (showResult) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (selectedChoice === null) return;

    const currentQuestion = questions[currentIndex];
    const selectedChoiceData = currentQuestion.choices.find(c => c.id === selectedChoice);
    
    if (selectedChoiceData?.is_correct) {
      setScore(score + currentQuestion.points);
    }

    setShowResult(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedChoice(null);
      setShowResult(false);
    } else {
      // クイズ終了 - 進捗を更新
      await updateProgress();
      router.push('/');
    }
  };

  const updateProgress = async () => {
    if (!userId) return;

    try {
      const totalQuestions = questions.length;
      const correctAnswers = Math.round(score / 10); // 1問10ptと仮定
      const completionRate = (correctAnswers / totalQuestions) * 100;
      const stars = completionRate >= 80 ? 3 : completionRate >= 50 ? 2 : 1;

      // user_progressを更新
      const { error } = await supabase
        .from('user_progress')
        .update({
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          completion_rate: completionRate,
          stars: stars,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('story_arc_id', arcId);

      if (error) {
        console.error('Error updating progress:', error);
      }
    } catch (error) {
      console.error('Error in updateProgress:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">📚 問題を読み込み中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#2C3E50] mb-4">
            😅 まだ問題が登録されていません
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-2 px-6 rounded-lg"
          >
            航海マップに戻る
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedChoice !== null && 
    currentQuestion.choices.find(c => c.id === selectedChoice)?.is_correct;

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2C3E50] mb-2">
            {arcName} クイズ
          </h1>
          <div className="flex justify-between text-[#7F8C8D]">
            <span>問題 {currentIndex + 1} / {questions.length}</span>
            <span>スコア: {score}pt</span>
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          {/* 難易度バッジ */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
              'bg-red-200 text-red-800'
            }`}>
              {currentQuestion.difficulty}
            </span>
            <span className="text-[#F39C12] font-bold">
              +{currentQuestion.points}pt
            </span>
          </div>

          {/* 問題文 */}
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6">
            {currentQuestion.question_text}
          </h2>

          {/* 選択肢 */}
          <div className="space-y-3 mb-6">
            {currentQuestion.choices
              .sort((a, b) => a.order_num - b.order_num)
              .map((choice) => {
                const isSelected = selectedChoice === choice.id;
                const showCorrect = showResult && choice.is_correct;
                const showWrong = showResult && isSelected && !choice.is_correct;

                return (
                  <button
                    key={choice.id}
                    onClick={() => handleChoiceClick(choice.id)}
                    disabled={showResult}
                    className={`w-full p-4 rounded-lg border-2 text-left font-medium transition-all ${
                      showCorrect ? 'bg-green-100 border-green-500' :
                      showWrong ? 'bg-red-100 border-red-500' :
                      isSelected ? 'bg-[#3498DB] border-[#2980B9] text-white' :
                      'bg-white border-[#95A5A6] hover:border-[#3498DB]'
                    } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-[#2C3E50]">
                      {showCorrect && '✅ '}
                      {showWrong && '❌ '}
                      {choice.choice_text}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* 結果表示 */}
          {showResult && (
            <div className={`p-4 rounded-lg mb-4 ${
              isCorrect ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'
            }`}>
              <div className="text-2xl font-bold mb-2">
                {isCorrect ? '🎉 正解！' : '😅 不正解...'}
              </div>
              {currentQuestion.explanation && (
                <p className="text-[#2C3E50]">
                  💡 {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end">
            {!showResult ? (
              <button
                onClick={handleSubmit}
                disabled={selectedChoice === null}
                className="bg-[#E74C3C] hover:bg-[#C0392B] text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                回答する
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-[#27AE60] hover:bg-[#229954] text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                {currentIndex < questions.length - 1 ? '次の問題へ' : '結果を見る'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}