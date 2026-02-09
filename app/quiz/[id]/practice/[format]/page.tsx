// app/quiz/[id]/practice/[format]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CountOption {
  value: string;
  label: string;
  emoji: string;
  color: string;
  count?: number;
}

export default function PracticeCountPage() {
  const params = useParams();
  const router = useRouter();
  const arcId = parseInt(params.id as string);
  const format = params.format as string;
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // ユーザーID取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // 総問題数を取得
      let query = supabase
        .from('questions')
        .select('id', { count: 'exact' })
        .eq('story_arc_id', arcId);

      if (format !== 'all') {
        query = query.eq('question_format', format);
      }

      const { count: total } = await query;
      setTotalQuestions(total || 0);

      // 全問題IDを取得
      let questionQuery = supabase
        .from('questions')
        .select('id')
        .eq('story_arc_id', arcId);

      if (format !== 'all') {
        questionQuery = questionQuery.eq('question_format', format);
      }

      const { data: questions } = await questionQuery;
      const questionIds = questions?.map(q => q.id) || [];

      if (questionIds.length === 0) {
        setLoading(false);
        return;
      }

      // 各問題の最新の回答を取得
      const { data: latestAnswers } = await supabase
        .from('answer_history')
        .select('question_id, is_correct, answered_at')
        .eq('user_id', user.id)
        .in('question_id', questionIds)
        .order('answered_at', { ascending: false });

      // 各問題の最新の回答のみを抽出
      const latestAnswersByQuestion = new Map<number, boolean>();
      latestAnswers?.forEach(answer => {
        if (!latestAnswersByQuestion.has(answer.question_id)) {
          latestAnswersByQuestion.set(answer.question_id, answer.is_correct);
        }
      });

      // 未回答の問題数
      const unanswered = questionIds.filter(id => !latestAnswersByQuestion.has(id)).length;
      setUnansweredCount(unanswered);

      // 誤答の問題数（最新の回答が不正解）
      const wrong = Array.from(latestAnswersByQuestion.entries())
        .filter(([_, isCorrect]) => !isCorrect)
        .length;
      setWrongCount(wrong);

      console.log('📊 Question stats:', {
        total,
        unanswered,
        wrong,
        answered: latestAnswersByQuestion.size
      });

      setLoading(false);
    };

    fetchData();
  }, [arcId, format, router]);

  const formatLabels: Record<string, string> = {
    all: '全問題形式',
    single_choice: '4択問題',
    multiple_choice: '複数選択',
    ordering: '並べ替え',
    free_text: '自由記述',
    numeric: '数値入力',
  };

  const countOptions: CountOption[] = [
    { 
      value: 'unanswered', 
      label: '未回答', 
      emoji: '❓', 
      color: 'from-gray-500 to-gray-700',
      count: unansweredCount 
    },
    { 
      value: 'wrong', 
      label: '誤答', 
      emoji: '❌', 
      color: 'from-red-500 to-red-700',
      count: wrongCount 
    },
    { 
      value: 'all', 
      label: '全問', 
      emoji: '🎯', 
      color: 'from-blue-500 to-blue-700',
      count: totalQuestions 
    },
    { 
      value: '10', 
      label: '10問', 
      emoji: '🔟', 
      color: 'from-green-500 to-green-700',
      count: Math.min(10, totalQuestions) 
    },
    { 
      value: '20', 
      label: '20問', 
      emoji: '2️⃣0️⃣', 
      color: 'from-purple-500 to-purple-700',
      count: Math.min(20, totalQuestions) 
    },
    { 
      value: '30', 
      label: '30問', 
      emoji: '3️⃣0️⃣', 
      color: 'from-orange-500 to-orange-700',
      count: Math.min(30, totalQuestions) 
    },
  ];

  const handleStart = (countOption: string) => {
    if (countOption === 'unanswered' || countOption === 'wrong') {
      // 未回答・誤答モード
      router.push(`/quiz/${arcId}/play?format=${format}&filter=${countOption}`);
    } else {
      // 通常モード
      const count = countOption === 'all' ? 0 : parseInt(countOption);
      router.push(`/quiz/${arcId}/play?format=${format}&count=${count}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/quiz/${arcId}/practice`)}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              📚 {formatLabels[format] || format}
            </h1>
            <p className="text-gray-600">
              問題数を選んでください
            </p>
          </div>
        </div>

        {/* 問題数選択 */}
        <div className="space-y-4">
          {countOptions.map((option) => {
            const isAvailable = (option.count || 0) > 0;
            
            return (
              <div
                key={option.value}
                onClick={() => {
                  if (isAvailable) {
                    handleStart(option.value);
                  }
                }}
                className={`
                  p-6 bg-gradient-to-r ${option.color}
                  rounded-lg border-4 border-gray-800
                  ${isAvailable ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                  transition-transform
                  shadow-lg
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{option.emoji}</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {option.label}
                    </h2>
                    <p className="text-white text-sm opacity-90">
                      {option.count}問
                    </p>
                  </div>
                  {isAvailable && (
                    <div className="text-white text-4xl">→</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ヒント */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
          <h3 className="font-bold text-blue-900 mb-2">💡 ヒント</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>未回答</strong>: まだ一度も回答していない問題</li>
            <li>• <strong>誤答</strong>: 直近の回答で間違えた問題</li>
            <li>• 問題はランダムな順番で出題されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}