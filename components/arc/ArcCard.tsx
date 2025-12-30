import { StoryArc, UserProgress } from '@/lib/supabase';
import ProgressBar from '../ui/ProgressBar';

interface ArcCardProps {
  arc: StoryArc;
  progress: UserProgress;
}

export default function ArcCard({ arc, progress }: ArcCardProps) {
  const getStarDisplay = (stars: number) => {
    return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  };

  const getProgressColor = () => {
    if (progress.completion_rate >= 80) return 'bg-green-600';
    if (progress.completion_rate >= 50) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  return (
    <div className={`bg-amber-50 border-4 border-black rounded-lg p-4 shadow-lg transition-all ${
      progress.is_unlocked ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-60'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{arc.emoji}</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#2C3E50]">{arc.display_name}</h3>
          <p className="text-sm text-gray-600">
            第{arc.volume_start}巻〜第{arc.volume_end || '?'}巻
          </p>
        </div>
        {progress.is_unlocked ? (
          <div className="text-right">
            <div className="text-2xl">{getStarDisplay(progress.stars)}</div>
            <div className="text-sm font-bold text-[#2C3E50]">
              {progress.completion_rate.toFixed(0)}%
            </div>
          </div>
        ) : (
          <div className="text-2xl">🔒</div>
        )}
      </div>

      {progress.is_unlocked ? (
        <>
          <ProgressBar 
            percentage={progress.completion_rate} 
            colorClass={getProgressColor()}
          />
          <div className="mt-2 text-sm text-gray-700 flex justify-between">
            <span>{progress.correct_answers} / {arc.target_questions}問</span>
            {progress.completion_rate < 100 && (
              <span className="text-[#B22222] font-semibold">
                あと{Math.ceil((arc.target_questions * (arc.unlock_threshold / 100)) - progress.correct_answers)}問で次エリア解放
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-gray-600 text-center py-2 bg-gray-100 rounded">
          🔒 {arc.unlock_condition ? `${arc.unlock_condition}編を${arc.unlock_threshold}%達成で解放` : '解放条件なし'}
        </div>
      )}
    </div>
  );
}