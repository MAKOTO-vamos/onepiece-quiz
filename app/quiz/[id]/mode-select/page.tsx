// app/quiz/[id]/mode-select/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StoryArc {
  id: number;
  name: string;
  emoji: string;
}

const STORY_ARCS: StoryArc[] = [
  { id: -1, name: '全体', emoji: '🌍' },
  { id: 0, name: '未分類', emoji: '❓' },
  { id: 1, name: 'イーストブルー', emoji: '🌊' },
  { id: 2, name: 'アラバスタ', emoji: '🏜️' },
  { id: 3, name: 'スカイピア', emoji: '☁️' },
  { id: 4, name: 'ウォーターセブン', emoji: '🚢' },
  { id: 5, name: 'スリラーバーク', emoji: '👻' },
  { id: 6, name: 'シャボンディ諸島〜女ヶ島', emoji: '🫧' },
  { id: 7, name: 'インペルダウン〜頂上戦争', emoji: '⚔️' },
  { id: 8, name: '魚人島', emoji: '🐠' },
  { id: 9, name: 'パンクハザード', emoji: '🔥' },
  { id: 10, name: 'ドレスローザ', emoji: '🌹' },
  { id: 11, name: 'ゾウ', emoji: '🐘' },
  { id: 12, name: 'ホールケーキアイランド', emoji: '🍰' },
  { id: 13, name: 'ワノ国', emoji: '🗾' },
  { id: 14, name: 'エッグヘッド', emoji: '🥚' },
  { id: 15, name: 'エルバフ', emoji: '⚔️' },
];

export default function ModeSelectPage() {
  const params = useParams();
  const router = useRouter();
  const arcId = parseInt(params.id as string);
  const [arc, setArc] = useState<StoryArc | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const selectedArc = STORY_ARCS.find(a => a.id === arcId);
      setArc(selectedArc || null);

      // 問題数を取得
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('story_arc_id', arcId);
      
      setTotalQuestions(count || 0);
      setLoading(false);
    };

    fetchData();
  }, [arcId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">読み込み中...</div>
      </div>
    );
  }

  if (!arc) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">エリアが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              {arc.emoji} {arc.name}
            </h1>
            <p className="text-gray-600">
              全{totalQuestions}問
            </p>
          </div>
        </div>

        {/* モード選択 */}
        <div className="space-y-4">
          {/* 昇格試験 */}
          <div
            onClick={() => router.push(`/quiz/${arcId}/exam`)}
            className="
              p-6 bg-gradient-to-r from-[#B22222] to-red-700
              rounded-lg border-4 border-[#8B0000]
              cursor-pointer hover:scale-105 transition-transform
              shadow-lg
            "
          >
            <div className="flex items-center gap-4">
              <div className="text-6xl">👑</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">
                  昇格試験
                </h2>
                <p className="text-red-100 text-sm">
                  全問正解で次のステージが開放されます
                </p>
              </div>
              <div className="text-white text-4xl">→</div>
            </div>
          </div>

          {/* 練習モード */}
          <div
            onClick={() => router.push(`/quiz/${arcId}/practice`)}
            className="
              p-6 bg-gradient-to-r from-[#3498DB] to-blue-600
              rounded-lg border-4 border-[#2C3E50]
              cursor-pointer hover:scale-105 transition-transform
              shadow-lg
            "
          >
            <div className="flex items-center gap-4">
              <div className="text-6xl">📚</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">
                  練習モード
                </h2>
                <p className="text-blue-100 text-sm">
                  問題形式・問題数を選んで練習できます
                </p>
              </div>
              <div className="text-white text-4xl">→</div>
            </div>
          </div>
        </div>

        {/* 説明 */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
          <h3 className="font-bold text-yellow-900 mb-2">💡 モードについて</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• <strong>昇格試験</strong>: 全問出題、全問正解で次のエリアが開放</li>
            <li>• <strong>練習モード</strong>: 問題形式や問題数を自由に選択可能</li>
          </ul>
        </div>
      </div>
    </div>
  );
}