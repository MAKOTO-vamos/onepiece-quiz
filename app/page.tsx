// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// エリアごとのアイコンと日本語名（データベースのstory_arcsテーブルと一致）
const ARC_INFO: Record<number, { icon: string; displayName: string; color: string }> = {
  '-1': { icon: '🌍', displayName: '全体', color: 'from-gray-500 to-gray-700' },
  0: { icon: '❓', displayName: '未分類', color: 'from-gray-400 to-gray-600' },
  1: { icon: '🌊', displayName: 'イーストブルー', color: 'from-blue-400 to-blue-600' },
  2: { icon: '🏜️', displayName: 'アラバスタ', color: 'from-yellow-400 to-orange-500' },
  3: { icon: '☁️', displayName: 'スカイピア', color: 'from-sky-300 to-sky-500' },
  4: { icon: '🚢', displayName: 'ウォーターセブン', color: 'from-cyan-400 to-blue-500' },
  5: { icon: '👻', displayName: 'スリラーバーク', color: 'from-purple-400 to-purple-600' },
  6: { icon: '🫧', displayName: 'シャボンディ諸島〜女ヶ島', color: 'from-green-400 to-emerald-500' },
  7: { icon: '⚔️', displayName: 'インペルダウン〜頂上戦争', color: 'from-red-500 to-red-700' },
  8: { icon: '🐠', displayName: '魚人島', color: 'from-teal-400 to-cyan-500' },
  9: { icon: '🔥', displayName: 'パンクハザード', color: 'from-orange-500 to-red-600' },
  10: { icon: '🌹', displayName: 'ドレスローザ', color: 'from-pink-400 to-rose-500' },
  11: { icon: '🐘', displayName: 'ゾウ', color: 'from-lime-500 to-green-600' },
  12: { icon: '🍰', displayName: 'ホールケーキアイランド', color: 'from-pink-300 to-pink-500' },
  13: { icon: '🗾', displayName: 'ワノ国', color: 'from-purple-500 to-purple-700' },
  14: { icon: '🥚', displayName: 'エッグヘッド', color: 'from-indigo-400 to-purple-500' },
  15: { icon: '⚔️', displayName: 'エルバフ', color: 'from-orange-500 to-amber-600' },
};

interface StoryArc {
  id: number;
  name: string;
  order_num: number;
  total_questions: number;
  require_promotion_exam: boolean;
  unlock_threshold: number;
  promotion_exam_question_count: number;
  promotion_exam_pass_rate: number;
}

interface UserProgress {
  story_arc_id: number;
  completion_rate: number;
  stars: number;
  is_unlocked: boolean;
  correct_answers: number;
  total_questions: number;
}

interface ArcWithExamStatus extends StoryArc {
  progress?: UserProgress;
  can_take_exam: boolean;
  should_auto_unlock: boolean;
  prev_completion_rate: number;
}

export default function HomePage() {
  const router = useRouter();
  const [arcs, setArcs] = useState<ArcWithExamStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // ユーザー情報取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // ストーリーアーク取得（昇格試験設定も含める）
      const { data: arcsData, error: arcsError } = await supabase
        .from('story_arcs')
        .select(`
          id,
          name,
          order_num,
          require_promotion_exam,
          unlock_threshold,
          promotion_exam_question_count,
          promotion_exam_pass_rate
        `)
        .order('order_num');

      if (arcsError) {
        console.error('Error fetching arcs:', arcsError);
        return;
      }

      // 各エリアの問題数を取得
      const arcsWithQuestionCount = await Promise.all(
        (arcsData || []).map(async (arc) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('story_arc_id', arc.id);
          
          return {
            ...arc,
            total_questions: count || 0
          };
        })
      );

      // 進捗情報取得
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) {
        console.error('Error fetching progress:', progressError);
        return;
      }

      // 各エリアの進捗率を回答履歴から計算
      const progressWithCalculatedRates = await Promise.all(
        arcsWithQuestionCount.map(async (arc) => {
          // そのエリアの全問題IDを取得
          const { data: questions } = await supabase
            .from('questions')
            .select('id')
            .eq('story_arc_id', arc.id);

          const questionIds = questions?.map(q => q.id) || [];
          
          if (questionIds.length === 0) {
            return {
              story_arc_id: arc.id,
              completion_rate: 0,
              correct_count: 0,
              total_count: 0,
            };
          }

          // 各問題の最新の回答を取得
          const { data: latestAnswers } = await supabase
            .from('answer_history')
            .select('question_id, is_correct, answered_at')
            .eq('user_id', user.id)
            .in('question_id', questionIds)
            .order('answered_at', { ascending: false });

          // 各問題の最新の回答のみを抽出
          const latestAnswersByQuestion = new Map<number, boolean>();
          latestAnswers?.forEach(answer => {
            if (!latestAnswersByQuestion.has(answer.question_id)) {
              latestAnswersByQuestion.set(answer.question_id, answer.is_correct);
            }
          });

          // 正解数をカウント
          const correctCount = Array.from(latestAnswersByQuestion.values())
            .filter(isCorrect => isCorrect).length;

          // 進捗率を計算
          const completionRate = questionIds.length > 0
            ? Math.round((correctCount / questionIds.length) * 100)
            : 0;

          console.log(`📊 Arc ${arc.id} (${arc.name}):`, {
            total: questionIds.length,
            correct: correctCount,
            rate: completionRate
          });

          return {
            story_arc_id: arc.id,
            completion_rate: completionRate,
            correct_count: correctCount,
            total_count: questionIds.length,
          };
        })
      );

      // 昇格試験の受験可否と自動解放を判定
      const arcsWithExamStatus: ArcWithExamStatus[] = arcsWithQuestionCount.map((arc, index) => {
        const arcProgress = progressData?.find(p => p.story_arc_id === arc.id);
        const calculatedProgress = progressWithCalculatedRates.find(p => p.story_arc_id === arc.id);
        
        // 前のエリアを取得
        const prevArc = index > 0 ? arcsWithQuestionCount[index - 1] : null;
        const prevProgress = prevArc 
          ? progressData?.find(p => p.story_arc_id === prevArc.id) 
          : null;

        const prevCompletionRate = prevProgress?.completion_rate ?? 0;
        const thresholdMet = prevCompletionRate >= arc.unlock_threshold;

        // 昇格試験を受けられるか判定
        const can_take_exam = 
          !arcProgress?.is_unlocked &&                // まだ解放されていない
          prevArc != null &&                          // 前のエリアが存在する
          arc.require_promotion_exam;                 // 昇格試験が必要（進捗率は不要）

        // 自動解放すべきか判定
        const should_auto_unlock =
          !arcProgress?.is_unlocked &&                // まだ解放されていない
          prevArc != null &&                          // 前のエリアが存在する
          !arc.require_promotion_exam;                // 昇格試験が不要（進捗率は無関係）

        // デバッグログ
        if (arc.id <= 5) {
          console.log(`🔍 ${arc.name}:`, {
            isUnlocked: arcProgress?.is_unlocked ?? false,
            requireExam: arc.require_promotion_exam,
            examQuestions: arc.promotion_exam_question_count,
            examPassRate: arc.promotion_exam_pass_rate,
            prevCompletionRate,
            threshold: arc.unlock_threshold,
            thresholdMet,
            can_take_exam,
            should_auto_unlock,
          });
        }

        return {
          ...arc,
          progress: arcProgress ? {
            ...arcProgress,
            completion_rate: calculatedProgress?.completion_rate ?? arcProgress.completion_rate,
          } : undefined,
          can_take_exam,
          should_auto_unlock,
          prev_completion_rate: prevCompletionRate,
        };
      });

      // 自動解放処理
      for (const arc of arcsWithExamStatus) {
        if (arc.should_auto_unlock) {
          console.log(`🔓 Auto-unlocking: ${arc.name}`);
          await supabase
            .from('user_progress')
            .update({
              is_unlocked: true,
              unlocked_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('story_arc_id', arc.id);
        }
      }

      // 自動解放した場合は再読み込み
      if (arcsWithExamStatus.some(arc => arc.should_auto_unlock)) {
        // 再度データを取得
        const { data: updatedProgressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);

        // 更新されたデータで再構築
        const updatedArcsWithExamStatus = arcsWithExamStatus.map(arc => {
          const updatedProgress = updatedProgressData?.find(p => p.story_arc_id === arc.id);
          return {
            ...arc,
            progress: updatedProgress,
            should_auto_unlock: false, // 既に解放済み
          };
        });

        setArcs(updatedArcsWithExamStatus);

        // 全体進捗を計算
        const mainArcs = updatedArcsWithExamStatus.filter(arc => arc.id !== 0 && arc.id !== -1);
        const totalCompletion = mainArcs.reduce((sum, arc) => {
          return sum + (arc.progress?.completion_rate || 0);
        }, 0);
        const avgCompletion = mainArcs.length > 0 ? Math.round(totalCompletion / mainArcs.length) : 0;
        setOverallProgress(avgCompletion);
      } else {
        setArcs(arcsWithExamStatus);

        // 全体進捗を計算
        const mainArcs = arcsWithExamStatus.filter(arc => arc.id !== 0 && arc.id !== -1);
        const totalCompletion = mainArcs.reduce((sum, arc) => {
          return sum + (arc.progress?.completion_rate || 0);
        }, 0);
        const avgCompletion = mainArcs.length > 0 ? Math.round(totalCompletion / mainArcs.length) : 0;
        setOverallProgress(avgCompletion);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

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
        {/* ログアウトボタン */}
        <div className="flex justify-end mb-4">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            🚪 ログアウト
          </button>
        </div>

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4">🏴‍☠️</div>
          <h1 className="text-5xl font-bold text-[#2C3E50] mb-2">
            GRAND LINE KNOWLEDGE
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            〜知識王への航海〜
          </p>
          
          {/* 全体進捗 */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-gray-700">📊 全体の達成度</span>
              <span className="text-2xl font-bold text-[#2C3E50]">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 border-2 border-gray-400">
              <div
                className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-full rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 知識練習ボタン */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/knowledge')}
            className="
              w-full p-6 
              bg-gradient-to-r from-purple-500 to-purple-700
              rounded-lg border-4 border-gray-800
              hover:scale-105 transition-transform
              shadow-lg
            "
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-6xl">📖</div>
                <div className="text-left">
                  <h2 className="text-3xl font-bold text-white mb-1">
                    知識練習問題
                  </h2>
                  <p className="text-white text-sm opacity-90">
                    カテゴリー別に知識を深めよう
                  </p>
                </div>
              </div>
              <div className="text-white text-4xl">→</div>
            </div>
          </button>
        </div>

        {/* ストーリーアーク一覧 */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">🏴‍☠️</div>
            <h2 className="text-3xl font-bold text-[#2C3E50]">
              ストーリーアーク
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            物語の順番に沿って冒険しよう！各エリアの昇格試験に合格すると、次のエリアが解放されます。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {arcs
              .filter(arc => arc.id !== 0 && arc.id !== -1) // 未分類と全体を除外
              .map((arc) => {
                const isUnlocked = arc.progress?.is_unlocked ?? false;
                const completionRate = arc.progress?.completion_rate || 0;
                const stars = arc.progress?.stars || 0;
                const arcInfo = ARC_INFO[arc.id] || { icon: '🏝️', displayName: arc.name, color: 'from-gray-400 to-gray-600' };

                // デバッグ: IDと名前を確認
                if (!ARC_INFO[arc.id]) {
                  console.log(`Missing ARC_INFO for ID ${arc.id}: ${arc.name}`);
                }

                return (
                  <div
                    key={arc.id}
                    className={`
                      p-6 bg-gradient-to-br ${arcInfo.color} rounded-lg border-4 border-gray-800
                      ${!isUnlocked && !arc.can_take_exam ? 'opacity-50' : ''}
                      transition-all shadow-lg
                    `}
                  >
                    {/* 昇格試験受験可能 */}
                    {!isUnlocked && arc.can_take_exam && (
                      <div className="text-center mb-2">
                        <span className="text-5xl">🎓</span>
                        <p className="text-sm text-white mt-1 font-bold">
                          前のエリアで昇格試験を受けよう！
                        </p>
                      </div>
                    )}

                    {/* 昇格試験OFFだがまだ解放されていない */}
                    {!isUnlocked && !arc.can_take_exam && (
                      <div className="text-center mb-2">
                        <span className="text-5xl">⏳</span>
                        <p className="text-sm text-white mt-1 font-bold">
                          もうすぐ解放されます...
                        </p>
                      </div>
                    )}
                    
                    <div className="text-center mb-3">
                      <div className="text-7xl mb-2">{arcInfo.icon}</div>
                      <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                        {arcInfo.displayName}
                      </h3>
                    </div>
                    
                    <div className="flex justify-center items-center gap-2 mb-3">
                      <span className="text-2xl">📚</span>
                      <p className="text-sm text-white font-bold">
                        全{arc.total_questions}問
                      </p>
                    </div>

                    {/* 解放済みの場合 */}
                    {isUnlocked && (
                      <>
                        {/* 進捗バー */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-white font-bold">達成度</span>
                            <span className="text-xs text-white font-bold">{completionRate.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-white bg-opacity-30 rounded-full h-4 border-2 border-white overflow-hidden">
                            <div
                              className="bg-yellow-300 h-full rounded-full transition-all"
                              style={{ 
                                width: `${completionRate}%`,
                                minWidth: completionRate > 0 ? '8px' : '0'
                              }}
                            />
                          </div>
                        </div>

                        {/* 星評価 */}
                        <div className="flex justify-center items-center gap-2 mb-3">
                          <span className="text-sm text-white font-bold">評価:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3].map((star) => (
                              <span key={star} className="text-3xl drop-shadow-lg">
                                {star <= stars ? '⭐' : '☆'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* クイズを始めるボタン */}
                        <button
                          onClick={() => router.push(`/quiz/${arc.id}/mode-select`)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors border-2 border-white"
                        >
                          🎮 クイズを始める
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* その他の問題エリア */}
        <div className="mb-8 p-6 bg-yellow-50 rounded-lg border-2 border-yellow-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">📚</div>
            <h2 className="text-3xl font-bold text-[#2C3E50]">
              その他の問題
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            全体問題や未分類の問題を解いてみよう！
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 全体エリア */}
            {(() => {
              // エルバフ（ID: 15）の進捗を確認
              const elbafArc = arcs.find(a => a.id === 15);
              const isOverallUnlocked = elbafArc && elbafArc.progress && elbafArc.progress.completion_rate >= 70;
              
              return (
                <div
                  onClick={() => isOverallUnlocked && router.push('/quiz/-1/mode-select')}
                  className={`
                    p-6 rounded-lg border-4 shadow-lg
                    transition-transform
                    ${isOverallUnlocked 
                      ? 'bg-gradient-to-r from-gray-200 to-gray-300 border-gray-500 cursor-pointer hover:scale-105' 
                      : 'bg-gradient-to-r from-gray-300 to-gray-400 border-gray-600 opacity-60 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-5xl relative">
                      🌍
                      {!isOverallUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl">🔒</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        全体
                        {!isOverallUnlocked && <span className="text-red-600 ml-2">🔒</span>}
                      </h3>
                      <p className="text-sm text-gray-800">
                        {isOverallUnlocked 
                          ? '複数エリアにまたがる総合問題' 
                          : 'エルバフをクリアで解放'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 未分類エリア */}
            <div
              onClick={() => router.push('/quiz/0/mode-select')}
              className="
                p-6 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded-lg border-4 border-yellow-500
                cursor-pointer hover:scale-105
                transition-transform shadow-lg
              "
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">❓</div>
                <div>
                  <h3 className="text-2xl font-bold text-yellow-900 mb-1">
                    未分類
                  </h3>
                  <p className="text-sm text-yellow-800">
                    エリアが特定できない問題
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}