// app/quiz/[id]/practice/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QuestionCount {
  format: string;
  count: number;
  label: string;
  emoji: string;
  color: string;
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const arcId = parseInt(params.id as string);
  const [questionCounts, setQuestionCounts] = useState<QuestionCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionCounts = async () => {
      const formats = [
        { format: 'all', label: '全問題形式', emoji: '🎯', color: 'from-red-500 to-red-700' },
        { format: 'single_choice', label: '4択問題', emoji: '📝', color: 'from-blue-500 to-blue-700' },
        { format: 'multiple_choice', label: '複数選択', emoji: '☑️', color: 'from-purple-500 to-purple-700' },
        { format: 'ordering', label: '並べ替え', emoji: '🔀', color: 'from-pink-500 to-pink-700' },
        { format: 'free_text', label: '自由記述', emoji: '✍️', color: 'from-green-500 to-green-700' },
        { format: 'numeric', label: '数値入力', emoji: '🔢', color: 'from-orange-500 to-orange-700' },
      ];

      const counts = await Promise.all(
        formats.map(async (f) => {
          if (f.format === 'all') {
            // 全問題形式の場合、全問題数を取得
            const { count } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('story_arc_id', arcId);
            
            return {
              ...f,
              count: count || 0,
            };
          } else {
            const { count } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('story_arc_id', arcId)
              .eq('question_format', f.format);

            return {
              ...f,
              count: count || 0,
            };
          }
        })
      );

      setQuestionCounts(counts);
      setLoading(false);
    };

    fetchQuestionCounts();
  }, [arcId]);

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
            onClick={() => router.push(arcId === 0 ? '/' : `/quiz/${arcId}/mode-select`)}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              📚 練習モード
            </h1>
            <p className="text-gray-600">
              問題形式を選んでください
            </p>
          </div>
        </div>

        {/* 問題形式一覧 */}
        <div className="space-y-4">
          {questionCounts.map((q) => (
            <div
              key={q.format}
              onClick={() => {
                if (q.count > 0) {
                  router.push(`/quiz/${arcId}/practice/${q.format}`);
                }
              }}
              className={`
                p-6 bg-gradient-to-r ${q.color}
                rounded-lg border-4 border-gray-800
                ${q.count > 0 ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                transition-transform
                shadow-lg
              `}
            >
              <div className="flex items-center gap-4">
                <div className="text-6xl">{q.emoji}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {q.label}
                  </h2>
                  <p className="text-white text-sm opacity-90">
                    {q.count}問
                  </p>
                </div>
                {q.count > 0 && (
                  <div className="text-white text-4xl">→</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ヒント */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
          <h3 className="font-bold text-blue-900 mb-2">💡 ヒント</h3>
          <p className="text-sm text-blue-800">
            次の画面で問題数（全問/10問/20問/30問）を選択できます
          </p>
        </div>
      </div>
    </div>
  );
}