// components/quiz/QuizResult.tsx
'use client';

import { useRouter } from 'next/navigation';

interface QuizResultProps {
  mode: 'exam' | 'practice';
  correctAnswers: number;
  totalQuestions: number;
  arcId: number;
  arcName: string;
  arcEmoji: string;
}

export default function QuizResult({
  mode,
  correctAnswers,
  totalQuestions,
  arcId,
  arcName,
  arcEmoji,
}: QuizResultProps) {
  const router = useRouter();
  const isPerfect = correctAnswers === totalQuestions;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // 星の評価
  let stars = 0;
  if (percentage >= 100) stars = 3;
  else if (percentage >= 70) stars = 2;
  else if (percentage >= 40) stars = 1;

  if (mode === 'exam') {
    // 昇格試験モード
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {isPerfect ? (
            // 合格
            <div className="text-center">
              <div className="text-8xl mb-4 animate-bounce">🎉</div>
              <h1 className="text-5xl font-bold text-green-600 mb-4">
                合格！
              </h1>
              <p className="text-2xl text-gray-700 mb-2">
                {arcEmoji} {arcName}
              </p>
              <p className="text-xl text-gray-600 mb-8">
                昇格試験クリア
              </p>

              <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-green-500 mb-8">
                <div className="text-6xl font-bold text-green-600 mb-4">
                  {correctAnswers} / {totalQuestions}
                </div>
                <p className="text-2xl text-gray-700 mb-4">全問正解！</p>
                <div className="flex justify-center gap-2 text-5xl">
                  <span>⭐</span>
                  <span>⭐</span>
                  <span>⭐</span>
                </div>
              </div>

              <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300 mb-8">
                <p className="text-lg text-yellow-900 font-bold">
                  🎯 次のエリアがアンロックされました！
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-4 px-6 bg-[#3498DB] hover:bg-blue-600 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  ホームに戻る
                </button>
                <button
                  onClick={() => router.push(`/quiz/${arcId}/mode-select`)}
                  className="w-full py-4 px-6 bg-gray-500 hover:bg-gray-600 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  このエリアに戻る
                </button>
              </div>
            </div>
          ) : (
            // 不合格
            <div className="text-center">
              <div className="text-8xl mb-4">😢</div>
              <h1 className="text-5xl font-bold text-red-600 mb-4">
                不合格
              </h1>
              <p className="text-2xl text-gray-700 mb-2">
                {arcEmoji} {arcName}
              </p>
              <p className="text-xl text-gray-600 mb-8">
                昇格試験
              </p>

              <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-red-500 mb-8">
                <div className="text-6xl font-bold text-red-600 mb-4">
                  {correctAnswers} / {totalQuestions}
                </div>
                <p className="text-xl text-gray-700 mb-2">
                  {totalQuestions - correctAnswers}問間違えました
                </p>
                <p className="text-gray-600">
                  全問正解が必要です
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300 mb-8">
                <h3 className="font-bold text-blue-900 mb-2">💡 アドバイス</h3>
                <ul className="text-sm text-blue-800 space-y-1 text-left">
                  <li>• 練習モードで各問題形式に慣れましょう</li>
                  <li>• 間違えた問題の解説をしっかり読みましょう</li>
                  <li>• 自信がついたら再挑戦してください</li>
                </ul>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => router.push(`/quiz/${arcId}/exam`)}
                  className="w-full py-4 px-6 bg-[#B22222] hover:bg-red-700 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  🔄 再挑戦する
                </button>
                <button
                  onClick={() => router.push(`/quiz/${arcId}/practice`)}
                  className="w-full py-4 px-6 bg-[#3498DB] hover:bg-blue-600 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  📚 練習モードで学習する
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-4 px-6 bg-gray-500 hover:bg-gray-600 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  ホームに戻る
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // 練習モード
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="text-8xl mb-4">
            {percentage >= 70 ? '🎉' : percentage >= 40 ? '😊' : '😅'}
          </div>
          <h1 className="text-5xl font-bold text-[#2C3E50] mb-4">
            お疲れ様でした！
          </h1>
          <p className="text-2xl text-gray-700 mb-2">
            {arcEmoji} {arcName}
          </p>
          <p className="text-xl text-gray-600 mb-8">
            練習モード
          </p>

          <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-8">
            <div className="text-6xl font-bold text-[#3498DB] mb-4">
              {correctAnswers} / {totalQuestions}
            </div>
            <p className="text-2xl text-gray-700 mb-4">
              正答率: {percentage}%
            </p>
            <div className="flex justify-center gap-2 text-5xl">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={i < stars ? '' : 'opacity-20'}>
                  ⭐
                </span>
              ))}
            </div>
          </div>

          {percentage === 100 && (
            <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300 mb-8">
              <p className="text-lg text-yellow-900 font-bold">
                🏆 パーフェクト！素晴らしい！
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => router.push(`/quiz/${arcId}/practice`)}
              className="w-full py-4 px-6 bg-[#3498DB] hover:bg-blue-600 text-white font-bold text-xl rounded-lg transition-colors"
            >
              🔄 もう一度練習する
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 px-6 bg-gray-500 hover:bg-gray-600 text-white font-bold text-xl rounded-lg transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }
}