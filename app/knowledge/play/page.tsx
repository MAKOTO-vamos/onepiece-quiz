// app/quiz/knowledge/play/page.tsx
'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 型定義
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
  question_format: string;
  choices: Choice[];
}

// useSearchParamsを使うコンポーネントを分離
function KnowledgePlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');
  const count = parseInt(searchParams.get('count') || '10');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ユーザーIDを取得
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const loadQuestions = async () => {
    try {
      if (!categoryId) {
        router.push('/knowledge');
        return;
      }

      console.log('🔍 Loading questions for category:', categoryId, 'count:', count);

      const { data: questionsData, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
          points,
          explanation,
          question_format,
          choices (
            id,
            choice_text,
            is_correct,
            order_num
          )
        `)
        .eq('learning_mode', 'knowledge_base')
        .eq('knowledge_category', categoryId);

      if (error) {
        console.error('❌ Error loading questions:', error);
        return;
      }

      console.log('✅ Questions loaded:', questionsData?.length || 0);

      if (questionsData && questionsData.length > 0) {
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, count);
        console.log('📊 Selected questions:', limited.length);
        setQuestions(limited as Question[]);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const handleChoiceClick = (choiceId: number) => {
    if (showResult) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = async () => {
    if (selectedChoice === null) return;

    const currentQuestion = questions[currentIndex];
    const selectedChoiceData = currentQuestion.choices.find((c: Choice) => c.id === selectedChoice);
    const isCorrect = selectedChoiceData?.is_correct || false;

    if (isCorrect) {
      setScore(score + 1);
    }

    // 回答履歴を保存
    if (userId) {
      try {
        await supabase
          .from('answer_history')
          .insert({
            user_id: userId,
            question_id: currentQuestion.id,
            is_correct: isCorrect,
          });
        console.log('✅ Answer saved:', { question_id: currentQuestion.id, is_correct: isCorrect });
      } catch (error) {
        console.error('❌ Error saving answer:', error);
      }
    }

    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedChoice(null);
      setShowResult(false);
    } else {
      router.push(`/knowledge/result?score=${score}&total=${questions.length}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">読み込み中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#2C3E50] mb-4">
            問題が見つかりません
          </div>
          <button
            onClick={() => router.push('/knowledge')}
            className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-2 px-6 rounded-lg"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedChoice !== null && 
    currentQuestion.choices.find((c: Choice) => c.id === selectedChoice)?.is_correct;

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between text-[#7F8C8D] mb-2">
            <span>問題 {currentIndex + 1} / {questions.length}</span>
            <span>正解数: {score}</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-[#3498DB] h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6">
            {currentQuestion.question_text}
          </h2>

          {/* 選択肢 */}
          <div className="space-y-3 mb-6">
            {currentQuestion.choices
              .sort((a: Choice, b: Choice) => a.order_num - b.order_num)
              .map((choice: Choice) => {
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
                    {showCorrect && '✅ '}
                    {showWrong && '❌ '}
                    {choice.choice_text}
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

// メインコンポーネント（Suspense境界）
export default function KnowledgePlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">読み込み中...</div>
      </div>
    }>
      <KnowledgePlayContent />
    </Suspense>
  );
}