'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArcCard from '@/components/arc/ArcCard';
import ProgressBar from '@/components/ui/ProgressBar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StoryArc {
  id: number;
  name: string;
  display_name: string;
  description: string;
  emoji: string;
  volume_start: number;
  volume_end: number | null;
  total_questions: number;
  target_questions: number;
  unlock_threshold: number;
  unlock_condition: string | null;
  order_num: number;
  background_color: string;
  created_at: string;
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
  unlocked_at: string | null;
  questions_remaining: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // fetchData を useCallback でメモ化
  const fetchData = useCallback(async (userId: string) => {
    try {
      // エリア情報取得（Supabaseクライアントを使用）
      const { data: arcsData, error: arcsError } = await supabase
        .from('story_arcs')
        .select('*')
        .order('order_num');

      if (arcsError) {
        console.error('Arcs fetch error:', arcsError);
        throw arcsError;
      }

      console.log('Arcs data:', arcsData);
      setArcs(arcsData || []);

      // ユーザー進捗取得（Supabaseクライアントを使用）
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('story_arc_id');

      if (progressError) {
        console.error('Progress fetch error:', progressError);
        throw progressError;
      }

      console.log('Progress data:', progressData);

      // 自動アンロック処理
      if (arcsData && progressData) {
        const updatedProgress = [...progressData];
        let needsUpdate = false;

        // order_numでソート、未分類（id=0）を除外
        const sortedArcs = [...arcsData]
          .filter(arc => arc.id !== 0)  // 未分類を除外
          .sort((a, b) => a.order_num - b.order_num);

        for (let i = 0; i < sortedArcs.length; i++) {
          const arc = sortedArcs[i];
          const progress = updatedProgress.find(p => p.story_arc_id === arc.id);

          // 最初のエリア（イーストブルー）は常にアンロック
          if (i === 0 && (!progress || !progress.is_unlocked)) {
            console.log(`Auto-unlocking first arc: ${arc.display_name}`);
            const { data, error } = await supabase
              .from('user_progress')
              .upsert({
                user_id: userId,
                story_arc_id: arc.id,
                total_questions: 0,
                correct_answers: 0,
                completion_rate: 0,
                stars: 0,
                is_unlocked: true,
                unlocked_at: new Date().toISOString(),
              })
              .select();
            
            if (error) {
              console.error('Unlock error details:', {
                error,
                errorMessage: error.message,
                errorCode: error.code,
                errorDetails: error.details,
                errorHint: error.hint,
              });
            } else {
              console.log('Unlock success:', data);
              needsUpdate = true;
            }
            continue;
          }

          // 2番目以降のエリア：前のエリアが100%クリアされていたらアンロック
          if (i > 0) {
            const prevArc = sortedArcs[i - 1];
            const prevProgress = updatedProgress.find(p => p.story_arc_id === prevArc.id);

            console.log(`Checking unlock for ${arc.display_name}:`, {
              prevArc: prevArc.display_name,
              prevProgress: prevProgress?.completion_rate,
              currentLocked: !progress?.is_unlocked,
            });

            if (prevProgress && prevProgress.completion_rate >= 100) {
              if (!progress || !progress.is_unlocked) {
                console.log(`✅ Unlocking arc ${arc.id}: ${arc.display_name}`);
                const { data, error } = await supabase
                  .from('user_progress')
                  .upsert({
                    user_id: userId,
                    story_arc_id: arc.id,
                    total_questions: 0,
                    correct_answers: 0,
                    completion_rate: 0,
                    stars: 0,
                    is_unlocked: true,
                    unlocked_at: new Date().toISOString(),
                  })
                  .select();
                
                if (error) {
                  console.error('Unlock error details:', {
                    arcId: arc.id,
                    arcName: arc.display_name,
                    error,
                    errorMessage: error.message,
                    errorCode: error.code,
                    errorDetails: error.details,
                    errorHint: error.hint,
                  });
                } else {
                  console.log('Unlock success:', data);
                  needsUpdate = true;
                }
              }
            }
          }
        }

        // アンロック処理があった場合、進捗データを再取得
        if (needsUpdate) {
          const { data: newProgressData } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .order('story_arc_id');

          setUserProgress(newProgressData || []);
        } else {
          setUserProgress(progressData || []);
        }
      } else {
        setUserProgress(progressData || []);
      }

      // 全体進捗を計算
      if (arcsData && progressData) {
        const totalArcs = arcsData.length;
        const completedArcs = progressData.filter(
          (p: UserProgress) => p.completion_rate >= 100
        ).length;
        const progress = totalArcs > 0 ? (completedArcs / totalArcs) * 100 : 0;
        setOverallProgress(Math.round(progress));
      }
    } catch (error) {
      console.error('Data fetch failed:', error);
    }
  }, []);

  // 認証チェックとデータ取得
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // セッション確認
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('No session found, redirecting to login');
          router.push('/login');
          return;
        }

        console.log('Session found:', session.user.id);
        setUser({ id: session.user.id, email: session.user.email });

        // データ取得
        await fetchData(session.user.id);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏴‍☠️</div>
          <p className="text-2xl font-bold text-[#2C3E50]">
            航海の準備中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-4">
            🏴‍☠️ ONE PIECE ナレッジクエスト
          </h1>
          <p className="text-lg text-[#7F8C8D] font-medium mb-6">
            {user?.email && `冒険者: ${user.email}`}
          </p>
          
          {/* 全体進捗 */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50] max-w-md mx-auto">
            <p className="text-sm text-[#7F8C8D] font-bold mb-2">
              全体進捗
            </p>
            <ProgressBar progress={overallProgress} />
            <p className="text-2xl font-bold text-[#2C3E50] mt-2">
              {overallProgress}%
            </p>
          </div>
        </div>

        {/* エリアカード */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {arcs.map((arc) => {
            const progress = userProgress.find(
              (p) => p.story_arc_id === arc.id
            );
            return (
              <ArcCard
                key={arc.id}
                arc={arc}
                progress={progress}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}