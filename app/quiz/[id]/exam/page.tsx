// app/quiz/[id]/exam/page.tsx
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
  display_name: string;
  emoji: string;
}

const STORY_ARCS: StoryArc[] = [
  { id: -1, name: '全体', display_name: '全体', emoji: '🌍' },
  { id: 0, name: '未分類', display_name: '未分類', emoji: '❓' },
  { id: 1, name: 'イーストブルー', display_name: 'イーストブルー', emoji: '🌊' },
  { id: 2, name: 'アラバスタ', display_name: 'アラバスタ', emoji: '🏜️' },
  { id: 3, name: 'スカイピア', display_name: 'スカイピア', emoji: '☁️' },
  { id: 4, name: 'ウォーターセブン', display_name: 'ウォーターセブン', emoji: '🚢' },
  { id: 5, name: 'スリラーバーク', display_name: 'スリラーバーク', emoji: '👻' },
  { id: 6, name: 'シャボンディ諸島〜女ヶ島', display_name: 'シャボンディ諸島〜女ヶ島', emoji: '🫧' },
  { id: 7, name: 'インペルダウン〜頂上戦争', display_name: 'インペルダウン〜頂上戦争', emoji: '⚔️' },
  { id: 8, name: '魚人島', display_name: '魚人島', emoji: '🐠' },
  { id: 9, name: 'パンクハザード', display_name: 'パンクハザード', emoji: '🔥' },
  { id: 10, name: 'ドレスローザ', display_name: 'ドレスローザ', emoji: '🌹' },
  { id: 11, name: 'ゾウ', display_name: 'ゾウ', emoji: '🐘' },
  { id: 12, name: 'ホールケーキアイランド', display_name: 'ホールケーキアイランド', emoji: '🍰' },
  { id: 13, name: 'ワノ国', display_name: 'ワノ国', emoji: '🗾' },
  { id: 14, name: 'エッグヘッド', display_name: 'エッグヘッド', emoji: '🥚' },
  { id: 15, name: 'エルバフ', display_name: 'エルバフ', emoji: '⚔️' },
];

export default function ExamPage() {
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

  const handleStart = () => {
    // 全問題形式、全問出題で開始
    router.push(`/quiz/${arcId}/play?format=all&count=${totalQuestions}&mode=exam`);
  };

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
            onClick={() => router.push(`/quiz/${arcId}/mode-select`)}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              👑 昇格試験
            </h1>
            <p className="text-2xl text-gray-700 mb-2">
              {arc.emoji} {arc.display_name}
            </p>
            <p className="text-gray-600">
              全{totalQuestions}問
            </p>
          </div>
        </div>

        {/* 試験の説明 */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#B22222] mb-6">
          <h2 className="text-2xl font-bold text-[#B22222] mb-4 text-center">
            ⚠️ 昇格試験のルール
          </h2>
          
          <div className="space-y-4 text-gray-800">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="font-bold">全{totalQuestions}問を出題</p>
                <p className="text-sm text-gray-600">全ての問題形式がランダムに出題されます</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold">全問正解で合格</p>
                <p className="text-sm text-gray-600">1問でも間違えたら不合格です</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-bold">合格すると次のステージが開放</p>
                <p className="text-sm text-gray-600">進捗率100%達成で次のエリアに挑戦できます</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="font-bold">何度でも挑戦可能</p>
                <p className="text-sm text-gray-600">不合格でもペナルティはありません</p>
              </div>
            </div>
          </div>
        </div>

        {/* 問題数の確認 */}
        {totalQuestions === 0 && (
          <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300 mb-6">
            <p className="text-yellow-800 text-center font-bold">
              ⚠️ このエリアにはまだ問題がありません
            </p>
          </div>
        )}

        {/* 開始ボタン */}
        <div className="text-center">
          {totalQuestions > 0 ? (
            <button
              onClick={handleStart}
              className="
                px-8 py-4
                bg-gradient-to-r from-[#B22222] to-red-700
                text-white text-xl font-bold
                rounded-lg
                border-4 border-[#8B0000]
                hover:scale-105
                transition-transform
                shadow-lg
              "
            >
              🏴‍☠️ 昇格試験を開始する
            </button>
          ) : (
            <button
              disabled
              className="
                px-8 py-4
                bg-gray-400 text-white text-xl font-bold
                rounded-lg
                border-4 border-gray-500
                cursor-not-allowed
                opacity-50
              "
            >
              問題がありません
            </button>
          )}
        </div>

        {/* 準備のヒント */}
        {totalQuestions > 0 && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <h3 className="font-bold text-blue-900 mb-2">💡 準備のヒント</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 練習モードで各問題形式に慣れておきましょう</li>
              <li>• 全問正解が必要なので、自信がついてから挑戦しましょう</li>
              <li>• 時間制限はないので、じっくり考えて回答できます</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}