'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Stats {
  totalQuestions: number;
  totalArcs: number;
  questionsByArc: { arc: string; emoji: string; count: number }[];
  questionsByDifficulty: { difficulty: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    totalArcs: 0,
    questionsByArc: [],
    questionsByDifficulty: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    // 全問題数
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    // 全エリア数
    const { count: totalArcs } = await supabase
      .from('story_arcs')
      .select('*', { count: 'exact', head: true });

    // エリア別問題数
    const { data: arcs } = await supabase
      .from('story_arcs')
      .select('id, display_name, emoji')
      .order('order_num');

    const questionsByArc = [];
    if (arcs) {
      for (const arc of arcs) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('story_arc_id', arc.id);

        questionsByArc.push({
          arc: arc.display_name,
          emoji: arc.emoji,
          count: count || 0,
        });
      }
    }

    // 難易度別問題数
    const { data: difficulties } = await supabase
      .from('questions')
      .select('difficulty');

    const difficultyMap: { [key: string]: number } = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    difficulties?.forEach((q) => {
      if (q.difficulty in difficultyMap) {
        difficultyMap[q.difficulty]++;
      }
    });

    const questionsByDifficulty = Object.entries(difficultyMap).map(
      ([difficulty, count]) => ({ difficulty, count })
    );

    setStats({
      totalQuestions: totalQuestions || 0,
      totalArcs: totalArcs || 0,
      questionsByArc,
      questionsByDifficulty,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
            📊 管理画面ダッシュボード
          </h1>
          <p className="text-[#7F8C8D] font-medium">
            ONE PIECEクイズアプリの問題管理システム
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#2C3E50] font-bold text-xl">
            読み込み中...
          </div>
        ) : (
          <>
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#3498DB]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#7F8C8D] text-sm font-bold mb-1">
                      総問題数
                    </p>
                    <p className="text-4xl font-bold text-[#2C3E50]">
                      {stats.totalQuestions}
                    </p>
                  </div>
                  <div className="text-5xl">📝</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#9B59B6]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#7F8C8D] text-sm font-bold mb-1">
                      エリア数
                    </p>
                    <p className="text-4xl font-bold text-[#2C3E50]">
                      {stats.totalArcs}
                    </p>
                  </div>
                  <div className="text-5xl">🗺️</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#27AE60]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#7F8C8D] text-sm font-bold mb-1">
                      Easy問題
                    </p>
                    <p className="text-4xl font-bold text-[#2C3E50]">
                      {stats.questionsByDifficulty.find(d => d.difficulty === 'easy')?.count || 0}
                    </p>
                  </div>
                  <div className="text-5xl">✅</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#E74C3C]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#7F8C8D] text-sm font-bold mb-1">
                      Hard問題
                    </p>
                    <p className="text-4xl font-bold text-[#2C3E50]">
                      {stats.questionsByDifficulty.find(d => d.difficulty === 'hard')?.count || 0}
                    </p>
                  </div>
                  <div className="text-5xl">🔥</div>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-8">
              <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
                🚀 クイックアクション
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/admin/import"
                  className="block p-6 bg-gradient-to-r from-[#3498DB] to-[#2980B9] hover:from-[#2980B9] hover:to-[#3498DB] text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  <div className="text-4xl mb-2">📥</div>
                  <h3 className="text-xl font-bold mb-1">問題をインポート</h3>
                  <p className="text-sm opacity-90">
                    JSONファイルから問題を一括登録
                  </p>
                </Link>

                <Link
                  href="/admin/edit"
                  className="block p-6 bg-gradient-to-r from-[#9B59B6] to-[#8E44AD] hover:from-[#8E44AD] hover:to-[#9B59B6] text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  <div className="text-4xl mb-2">✏️</div>
                  <h3 className="text-xl font-bold mb-1">問題を編集</h3>
                  <p className="text-sm opacity-90">
                    既存の問題を編集・削除
                  </p>
                </Link>

                <Link
                  href="/"
                  className="block p-6 bg-gradient-to-r from-[#27AE60] to-[#229954] hover:from-[#229954] hover:to-[#27AE60] text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  <div className="text-4xl mb-2">🎮</div>
                  <h3 className="text-xl font-bold mb-1">アプリを確認</h3>
                  <p className="text-sm opacity-90">
                    ユーザー画面で動作確認
                  </p>
                </Link>
              </div>
            </div>

            {/* エリア別問題数 */}
            <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50]">
              <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
                📊 エリア別問題数
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stats.questionsByArc.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-[#ECF0F1] rounded-lg border-2 border-[#BDC3C7] hover:border-[#3498DB] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-2xl font-bold text-[#2C3E50]">
                        {item.count}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#7F8C8D]">
                      {item.arc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}