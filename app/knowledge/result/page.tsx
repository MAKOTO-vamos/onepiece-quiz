// app/knowledge/result/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function KnowledgeResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const score = parseInt(searchParams.get('score') || '0');
  const total = parseInt(searchParams.get('total') || '10');
  
  const percentage = Math.round((score / total) * 100);
  
  const getMessage = () => {
    if (percentage === 100) return '完璧！';
    if (percentage >= 80) return '素晴らしい！';
    if (percentage >= 60) return 'よくできました！';
    if (percentage >= 40) return 'もう少し！';
    return '次は頑張ろう！';
  };

  const getEmoji = () => {
    if (percentage === 100) return '🎉';
    if (percentage >= 80) return '🌟';
    if (percentage >= 60) return '👍';
    if (percentage >= 40) return '💪';
    return '📚';
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-2xl mx-auto">
        {/* 結果カード */}
        <div className="bg-white rounded-lg shadow-2xl border-4 border-[#2C3E50] p-8">
          <div className="text-center mb-8">
            <div className="text-8xl mb-4">{getEmoji()}</div>
            <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
              {getMessage()}
            </h1>
            <p className="text-lg text-gray-600">
              知識練習問題の結果
            </p>
          </div>

          {/* スコア */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 mb-6">
            <div className="text-center">
              <div className="text-white text-6xl font-bold mb-2">
                {score} / {total}
              </div>
              <div className="text-white text-2xl font-bold">
                正答率: {percentage}%
              </div>
            </div>
          </div>

          {/* 進捗バー */}
          <div className="mb-8">
            <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  percentage >= 80 ? 'bg-green-500' :
                  percentage >= 60 ? 'bg-blue-500' :
                  percentage >= 40 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* 評価 */}
          <div className={`p-4 rounded-lg mb-6 ${
            percentage >= 80 ? 'bg-green-100 border-2 border-green-500' :
            percentage >= 60 ? 'bg-blue-100 border-2 border-blue-500' :
            percentage >= 40 ? 'bg-yellow-100 border-2 border-yellow-500' :
            'bg-red-100 border-2 border-red-500'
          }`}>
            <div className={`font-bold ${
              percentage >= 80 ? 'text-green-800' :
              percentage >= 60 ? 'text-blue-800' :
              percentage >= 40 ? 'text-yellow-800' :
              'text-red-800'
            }`}>
              {percentage >= 80 && '素晴らしい成績です！この調子で頑張りましょう。'}
              {percentage >= 60 && percentage < 80 && 'よくできました！もう少しで完璧です。'}
              {percentage >= 40 && percentage < 60 && '惜しい！復習してもう一度挑戦しましょう。'}
              {percentage < 40 && 'まだまだこれから！基礎から復習しましょう。'}
            </div>
          </div>

          {/* ボタン */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/knowledge')}
              className="w-full bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
            >
              別のカテゴリーに挑戦
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-300 text-center">
            <div className="text-3xl font-bold text-green-600">{score}</div>
            <div className="text-sm text-gray-600">正解</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 border-gray-300 text-center">
            <div className="text-3xl font-bold text-red-600">{total - score}</div>
            <div className="text-sm text-gray-600">不正解</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 border-gray-300 text-center">
            <div className="text-3xl font-bold text-blue-600">{percentage}%</div>
            <div className="text-sm text-gray-600">正答率</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">読み込み中...</div>
      </div>
    }>
      <KnowledgeResultContent />
    </Suspense>
  );
}