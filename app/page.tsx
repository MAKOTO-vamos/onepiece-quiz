'use client';

import { useEffect, useState } from 'react';
import { supabaseApi, StoryArc, UserProgress } from '@/lib/supabase';
import ArcCard from '@/components/arc/ArcCard';

interface ArcWithProgress {
  arc: StoryArc;
  progress: UserProgress;
}

export default function Home() {
  const [arcsWithProgress, setArcsWithProgress] = useState<ArcWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [arcs, progressList] = await Promise.all([
          supabaseApi.fetchStoryArcs(),
          supabaseApi.fetchUserProgress()
        ]);

        // エリアと進捗を結合（型を明示）
        const combined = arcs.map((arc: StoryArc) => {
          const progress = progressList.find((p: UserProgress) => p.story_arc_id === arc.id);
          return {
            arc,
            progress: progress || {
              id: 0,
              story_arc_id: arc.id,
              total_questions: 0,
              correct_answers: 0,
              completion_rate: 0,
              is_unlocked: false,
              unlocked_at: null,
              stars: 0,
              created_at: '',
              updated_at: ''
            }
          };
        });

        setArcsWithProgress(combined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4E4C1]">
        <div className="text-center">
          <div className="text-4xl mb-4">⚓</div>
          <div className="text-2xl font-bold text-[#2C3E50]">
            航海の準備中...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4E4C1]">
        <div className="text-red-600 text-xl font-bold">
          エラー: {error}
        </div>
      </div>
    );
  }

  const totalQuestions = arcsWithProgress.reduce((sum, item) => sum + item.arc.target_questions, 0);
  const totalCorrect = arcsWithProgress.reduce((sum, item) => sum + item.progress.correct_answers, 0);
  const overallProgress = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F4E4C1] relative overflow-hidden">
      {/* 背景テクスチャ */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{
             backgroundImage: `
               radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.15) 0%, transparent 50%),
               radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.15) 0%, transparent 50%)
             `,
           }}></div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 pb-20">
        {/* ヘッダー */}
        <div className="text-center py-6">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-2 drop-shadow-lg">
            ⚓ GRAND LINE<br/>KNOWLEDGE
          </h1>
          <p className="text-[#B22222] font-bold text-lg md:text-xl">
            ONE PIECE ナレッジキング対策
          </p>
        </div>

        {/* 全体進捗 */}
        <div className="bg-white border-4 border-black rounded-lg p-6 mb-6 shadow-xl">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4 flex items-center gap-2">
            🗺️ あなたの航海
          </h2>
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-[#2C3E50]">総合進捗</span>
              <span className="font-bold text-[#B22222]">{overallProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {totalCorrect} / {totalQuestions}問 正解
          </div>
        </div>

        {/* エリアリスト */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4 px-2">
            📍 航路
          </h2>
          {arcsWithProgress.map(({ arc, progress }) => (
            <ArcCard key={arc.id} arc={arc} progress={progress} />
          ))}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-[#2C3E50] text-sm px-4">
          <p className="font-semibold">海賊王を目指す者よ、知識の海を制覇せよ！</p>
        </div>
      </div>
    </div>
  );
}