'use client';

import { useRouter } from 'next/navigation';

interface StoryArc {
  id: number;
  name: string;
  display_name: string;
  description: string;
  emoji: string;
  volume_start: number;
  volume_end: number | null;
  total_questions: number;
  order_num: number;
  background_color: string;
}

interface UserProgress {
  id: number;
  user_id: string;
  story_arc_id: number;
  total_questions: number;
  correct_answers: number;
  completion_rate: number;
  stars: number;
  is_unlocked: boolean;
}

interface ArcCardProps {
  arc: StoryArc;
  progress?: UserProgress;  // ← オプショナルに変更
}

export default function ArcCard({ arc, progress }: ArcCardProps) {
  const router = useRouter();
  const isLocked = !progress?.is_unlocked;
  const completionRate = progress?.completion_rate || 0;

  const handleClick = () => {
    if (!isLocked) {
      // アンロック済みのエリアをクリックしたらクイズ画面へ
      router.push(`/quiz/${arc.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative p-4 rounded-lg shadow-lg border-4 transition-all ${
        isLocked
          ? 'border-gray-400 bg-gray-200 opacity-60 cursor-not-allowed'
          : 'border-[#2C3E50] hover:scale-105 cursor-pointer'
      }`}
      style={{
        backgroundColor: isLocked ? '#ECF0F1' : arc.background_color,
      }}
    >
      {/* ロックアイコン */}
      {isLocked && (
        <div className="absolute top-2 right-2 text-2xl">🔒</div>
      )}

      {/* エリア絵文字 */}
      <div className="text-5xl text-center mb-2">{arc.emoji}</div>

      {/* エリア名 */}
      <h3 className="text-lg font-bold text-center text-[#2C3E50] mb-2">
        {arc.display_name}
      </h3>

      {/* 進捗バー */}
      {!isLocked && (
        <div className="mt-2">
          <div className="w-full bg-gray-300 rounded-full h-2 mb-1">
            <div
              className="bg-[#27AE60] h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-center text-[#7F8C8D] font-bold">
            {completionRate}%
          </p>
        </div>
      )}

      {/* 星 */}
      {!isLocked && progress && (
        <div className="flex justify-center mt-2">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="text-xl">
              {i < (progress.stars || 0) ? '⭐' : '☆'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}