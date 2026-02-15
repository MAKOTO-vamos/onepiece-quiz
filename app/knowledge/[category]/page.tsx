// app/knowledge/[category]/page.tsx
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

const CATEGORY_INFO: Record<string, { name: string; emoji: string }> = {
  character: { name: 'キャラクター', emoji: '👤' },
  technique: { name: '技・能力', emoji: '⚡' },
  location: { name: '地名・国名', emoji: '🗺️' },
  term: { name: '用語・設定', emoji: '📚' },
  relationship: { name: '人間関係', emoji: '💬' },
  timeline: { name: '時系列・順序', emoji: '⏰' },
  organization: { name: '組織・団体', emoji: '🏛️' },
  item: { name: 'アイテム・武器', emoji: '⚔️' },
};

export default function KnowledgeCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const router = useRouter();
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionCount = async () => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('learning_mode', 'knowledge_base')
        .eq('knowledge_category', category);

      setTotalQuestions(count || 0);
      setLoading(false);
    };

    fetchQuestionCount();
  }, [category]);

  const categoryInfo = CATEGORY_INFO[category];

  const countOptions: CountOption[] = [
    { 
      value: 'all', 
      label: '全問', 
      emoji: '🎯', 
      color: 'from-blue-500 to-blue-700',
    },
    { 
      value: '10', 
      label: '10問', 
      emoji: '🔟', 
      color: 'from-green-500 to-green-700',
    },
    { 
      value: '20', 
      label: '20問', 
      emoji: '2️⃣0️⃣', 
      color: 'from-purple-500 to-purple-700',
    },
    { 
      value: '30', 
      label: '30問', 
      emoji: '3️⃣0️⃣', 
      color: 'from-orange-500 to-orange-700',
    },
  ];

  const handleStart = (countValue: string) => {
    const count = countValue === 'all' ? totalQuestions : parseInt(countValue);
    router.push(`/knowledge/play?category=${category}&count=${count}`);
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
            onClick={() => router.push('/knowledge')}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          
          <div className="text-center">
            <div className="text-6xl mb-4">{categoryInfo?.emoji}</div>
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              {categoryInfo?.name}
            </h1>
            <p className="text-gray-600">
              問題数を選んでください
            </p>
          </div>
        </div>

        {/* 問題数選択 */}
        <div className="space-y-4">
          {countOptions.map((option) => {
            const actualCount = option.value === 'all' 
              ? totalQuestions 
              : Math.min(parseInt(option.value), totalQuestions);
            const isAvailable = actualCount > 0;
            
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
                      {actualCount}問
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
            <li>• 問題はランダムな順番で出題されます</li>
            <li>• 全問: このカテゴリーの全ての問題に挑戦</li>
            <li>• 10/20/30問: 指定した問題数のみ出題</li>
          </ul>
        </div>
      </div>
    </div>
  );
}