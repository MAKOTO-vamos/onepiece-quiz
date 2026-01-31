// app/quiz/[id]/practice/[format]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FORMAT_LABELS: Record<string, { label: string; emoji: string }> = {
  'single_choice': { label: '4択問題', emoji: '📝' },
  'multiple_choice': { label: '複数選択', emoji: '☑️' },
  'ordering': { label: '並べ替え', emoji: '🔀' },
  'free_text': { label: '自由記述', emoji: '✍️' },
  'numeric': { label: '数値入力', emoji: '🔢' },
};

export default function QuestionCountSelectPage() {
  const params = useParams();
  const router = useRouter();
  const arcId = parseInt(params.id as string);
  const format = params.format as string;
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  const formatInfo = FORMAT_LABELS[format] || { label: '問題', emoji: '❓' };

  useEffect(() => {
    const fetchQuestionCount = async () => {
      let count = 0;
      
      if (format === 'all') {
        // 全問題形式の場合、全問題数を取得
        const { count: totalCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('story_arc_id', arcId);
        
        count = totalCount || 0;
      } else {
        // 特定の形式の場合
        const { count: formatCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('story_arc_id', arcId)
          .eq('question_format', format);
        
        count = formatCount || 0;
      }
      
      setTotalQuestions(count);
      setLoading(false);
    };

    fetchQuestionCount();
  }, [arcId, format]);

  const questionCounts = [
    { count: totalQuestions, label: '全問', color: 'from-blue-500 to-blue-700' },
    { count: 10, label: '10問', color: 'from-green-500 to-green-700' },
    { count: 20, label: '20問', color: 'from-yellow-500 to-yellow-700' },
    { count: 30, label: '30問', color: 'from-red-500 to-red-700' },
  ];

  const handleStart = (count: number) => {
    const actualCount = count === totalQuestions ? totalQuestions : Math.min(count, totalQuestions);
    router.push(`/quiz/${arcId}/play?format=${format}&count=${actualCount}`);
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
              {formatInfo.emoji} {formatInfo.label}
            </h1>
            <p className="text-gray-600">
              問題数を選んでください（全{totalQuestions}問）
            </p>
          </div>
        </div>

        {/* 問題数選択 */}
        <div className="space-y-4">
          {questionCounts.map((q) => {
            const displayCount = q.label === '全問' ? totalQuestions : q.count;
            // 全問の場合は常に利用可能、それ以外は問題数が十分あれば利用可能
            const isAvailable = q.label === '全問' || totalQuestions >= q.count;

            return (
              <div
                key={q.label}
                onClick={() => isAvailable && handleStart(displayCount)}
                className={`
                  p-6 bg-gradient-to-r ${q.color}
                  rounded-lg border-4 border-gray-800
                  ${isAvailable ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                  transition-transform
                  shadow-lg
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-1">
                      {q.label}
                    </h2>
                    <p className="text-white text-sm opacity-90">
                      {displayCount}問を出題
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
          <p className="text-sm text-blue-800">
            問題はランダムで出題されます
          </p>
        </div>
      </div>
    </div>
  );
}