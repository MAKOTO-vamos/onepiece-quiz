'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { shuffleChoices } from '@/lib/shuffleChoices';

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

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const arcId = parseInt(params.id as string);

  const [question, setQuestion] = useState<Question | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<Choice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQuestion = useCallback(async () => {
    setLoading(true);

    // エリアの問題をランダムに1問取得
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        *,
        choices (*)
      `)
      .eq('story_arc_id', arcId)
      .limit(10); // 10問取得してランダムに選ぶ

    if (error || !questions || questions.length === 0) {
      console.error('Question fetch error:', error);
      setLoading(false);
      return;
    }

    // ランダムに1問選択
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // 選択肢をシャッフル（型アサーション）
    const shuffled = shuffleChoices(randomQuestion.choices as Choice[]);

    setQuestion(randomQuestion as Question);
    setShuffledChoices(shuffled);
    setSelectedChoice(null);
    setShowResult(false);
    setLoading(false);
  }, [arcId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuestion();
  }, [fetchQuestion]);

  const handleChoiceClick = (choiceId: number) => {
    if (showResult) return; // 結果表示中はクリック無効
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (selectedChoice === null) return;
    setShowResult(true);
  };

  const handleNext = () => {
    fetchQuestion(); // 次の問題を取得
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">
          問題を読み込み中...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#2C3E50] mb-4">
            問題が見つかりません
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-3 px-6 rounded-lg"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  const selectedChoiceData = shuffledChoices.find(c => c.id === selectedChoice);
  const isCorrect = selectedChoiceData?.is_correct || false;

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              question.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
              question.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
              'bg-red-200 text-red-800'
            }`}>
              {question.difficulty}
            </span>
            <span className="text-[#F39C12] font-bold text-lg">
              +{question.points}pt
            </span>
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6">
            {question.question_text}
          </h2>

          {/* 選択肢（シャッフル済み） */}
          <div className="space-y-3">
            {shuffledChoices.map((choice) => {
              const isSelected = selectedChoice === choice.id;
              const showCorrect = showResult && choice.is_correct;
              const showWrong = showResult && isSelected && !choice.is_correct;

              return (
                <button
                  key={choice.id}
                  onClick={() => handleChoiceClick(choice.id)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-lg font-bold text-left transition-all ${
                    showCorrect
                      ? 'bg-green-500 text-white border-4 border-green-700'
                      : showWrong
                      ? 'bg-red-500 text-white border-4 border-red-700'
                      : isSelected
                      ? 'bg-[#3498DB] text-white border-4 border-[#2980B9]'
                      : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
                  } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {showCorrect && '✅ '}
                  {showWrong && '❌ '}
                  {choice.choice_text}
                </button>
              );
            })}
          </div>
        </div>

        {/* ボタン */}
        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null}
            className="w-full bg-[#27AE60] hover:bg-[#229954] disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors disabled:cursor-not-allowed"
          >
            回答する
          </button>
        ) : (
          <div>
            {/* 結果 */}
            <div className={`p-6 rounded-lg mb-4 ${
              isCorrect
                ? 'bg-green-100 border-4 border-green-500'
                : 'bg-red-100 border-4 border-red-500'
            }`}>
              <p className={`text-3xl font-bold mb-2 ${
                isCorrect ? 'text-green-700' : 'text-red-700'
              }`}>
                {isCorrect ? '🎉 正解！' : '😢 不正解...'}
              </p>
              {question.explanation && (
                <p className="text-gray-700 font-medium">
                  💡 {question.explanation}
                </p>
              )}
            </div>

            {/* 次の問題ボタン */}
            <button
              onClick={handleNext}
              className="w-full bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors"
            >
              次の問題へ →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}