// app/knowledge/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface KnowledgeCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { 
    id: 'character', 
    name: 'キャラクター', 
    emoji: '👤', 
    description: 'ビブルカード情報・プロフィール',
    color: 'from-blue-500 to-blue-700'
  },
  { 
    id: 'technique', 
    name: '技・能力', 
    emoji: '⚡', 
    description: '技の名前・使用順序・悪魔の実',
    color: 'from-red-500 to-red-700'
  },
  { 
    id: 'location', 
    name: '地名・国名', 
    emoji: '🗺️', 
    description: '島・国・海域の名前',
    color: 'from-green-500 to-green-700'
  },
  { 
    id: 'term', 
    name: '用語・設定', 
    emoji: '📚', 
    description: '世界観・設定・専門用語',
    color: 'from-purple-500 to-purple-700'
  },
  { 
    id: 'relationship', 
    name: '人間関係', 
    emoji: '💬', 
    description: 'キャラの呼び方・呼ばれ方',
    color: 'from-pink-500 to-pink-700'
  },
  { 
    id: 'timeline', 
    name: '時系列・順序', 
    emoji: '⏰', 
    description: '出来事の順番・年表',
    color: 'from-yellow-500 to-yellow-700'
  },
  { 
    id: 'organization', 
    name: '組織・団体', 
    emoji: '🏛️', 
    description: '海軍・海賊団・政府組織',
    color: 'from-indigo-500 to-indigo-700'
  },
  { 
    id: 'item', 
    name: 'アイテム・武器', 
    emoji: '⚔️', 
    description: '武器・道具・宝',
    color: 'from-orange-500 to-orange-700'
  },
];

export default function KnowledgePage() {
  const router = useRouter();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      
      for (const category of KNOWLEDGE_CATEGORIES) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('learning_mode', 'knowledge_base')
          .eq('knowledge_category', category.id);
        
        counts[category.id] = count || 0;
      }
      
      setCategoryCounts(counts);
      setLoading(false);
    };

    fetchCounts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← ホームに戻る
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              📖 知識練習問題
            </h1>
            <p className="text-gray-600">
              カテゴリー別に知識を深めよう
            </p>
          </div>
        </div>

        {/* カテゴリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {KNOWLEDGE_CATEGORIES.map((category) => {
            const count = categoryCounts[category.id] || 0;
            
            return (
              <div
                key={category.id}
                onClick={() => {
                  if (count > 0) {
                    router.push(`/knowledge/${category.id}`);
                  }
                }}
                className={`
                  p-6 bg-gradient-to-r ${category.color}
                  rounded-lg border-4 border-gray-800
                  ${count > 0 ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                  transition-transform
                  shadow-lg
                `}
              >
                <div className="text-center">
                  <div className="text-6xl mb-3">{category.emoji}</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {category.name}
                  </h2>
                  <p className="text-white text-sm opacity-90 mb-3">
                    {category.description}
                  </p>
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <p className="text-white font-bold">
                      {count}問
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ヒント */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
          <h3 className="font-bold text-blue-900 mb-2">💡 知識練習問題について</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• ストーリー進行に関係なく、いつでも練習できます</li>
            <li>• カテゴリーごとに知識を体系的に学べます</li>
            <li>• 問題形式・問題数を自由に選択できます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}