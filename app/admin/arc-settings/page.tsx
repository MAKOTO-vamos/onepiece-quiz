'use client';

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
  order_num: number;
  require_promotion_exam: boolean;
  promotion_exam_question_count: number;
  promotion_exam_pass_rate: number;
  unlock_threshold: number;
}

export default function ArcSettings() {
  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingArc, setEditingArc] = useState<StoryArc | null>(null);

  useEffect(() => {
    loadArcs();
  }, []);

  const loadArcs = async () => {
    try {
      const { data, error } = await supabase
        .from('story_arcs')
        .select('*')
        .order('order_num');

      if (error) throw error;
      setArcs(data || []);
    } catch (error) {
      console.error('Error loading arcs:', error);
      setMessage('エラー: データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (arc: StoryArc) => {
    setEditingArc({ ...arc });
    setMessage('');
  };

  const handleCancel = () => {
    setEditingArc(null);
    setMessage('');
  };

  const handleSave = async () => {
    if (!editingArc) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('story_arcs')
        .update({
          require_promotion_exam: editingArc.require_promotion_exam,
          promotion_exam_question_count: editingArc.promotion_exam_question_count,
          promotion_exam_pass_rate: editingArc.promotion_exam_pass_rate,
          unlock_threshold: editingArc.unlock_threshold,
        })
        .eq('id', editingArc.id);

      if (error) throw error;

      setMessage(`✅ ${editingArc.display_name}の設定を保存しました`);
      setEditingArc(null);
      await loadArcs();
    } catch (error) {
      console.error('Error saving arc:', error);
      setMessage('❌ 保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const updateEditingArc = (field: keyof StoryArc, value: string | number | boolean) => {
    if (!editingArc) return;
    setEditingArc({
      ...editingArc,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">📚 読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
            🗺️ ストーリーアーク設定
          </h1>
          <p className="text-[#7F8C8D]">
            各エリアの解放条件と昇格試験を設定できます
          </p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith('✅') 
              ? 'bg-green-100 border-2 border-green-500 text-green-800' 
              : 'bg-red-100 border-2 border-red-500 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* エリア一覧 */}
        <div className="space-y-4">
          {arcs.map((arc) => {
            const isEditing = editingArc?.id === arc.id;
            const currentArc = isEditing ? editingArc : arc;

            return (
              <div
                key={arc.id}
                className="bg-white rounded-lg shadow-lg border-4 border-[#2C3E50] overflow-hidden"
              >
                {/* アークヘッダー */}
                <div className="bg-[#2C3E50] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{arc.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold">{arc.display_name}</h3>
                      <p className="text-sm text-gray-300">
                        {arc.order_num === 1 ? '最初のエリア（常に解放）' : `エリア ${arc.order_num}`}
                      </p>
                    </div>
                  </div>
                  {arc.order_num > 1 && !isEditing && (
                    <button
                      onClick={() => handleEdit(arc)}
                      className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                      ⚙️ 編集
                    </button>
                  )}
                </div>

                {/* 設定内容 */}
                {arc.order_num > 1 && (
                  <div className="p-6">
                    {isEditing ? (
                      /* 編集モード */
                      <div className="space-y-6">
                        {/* 制限の有無 */}
                        <div className="border-2 border-[#95A5A6] rounded-lg p-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentArc.require_promotion_exam}
                              onChange={(e) => updateEditingArc('require_promotion_exam', e.target.checked)}
                              className="w-6 h-6 rounded border-2 border-[#95A5A6]"
                            />
                            <div>
                              <div className="font-bold text-lg text-[#2C3E50]">
                                🎓 昇格試験を有効にする
                              </div>
                              <p className="text-sm text-[#7F8C8D]">
                                ONにすると、前のエリアで一定の進捗率を達成した後、昇格試験に合格する必要があります
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* 進捗率設定 */}
                        <div className="border-2 border-[#95A5A6] rounded-lg p-4">
                          <label className="block mb-2">
                            <span className="font-bold text-[#2C3E50]">
                              📊 前エリアの必要進捗率
                            </span>
                            <p className="text-sm text-[#7F8C8D] mb-3">
                              この進捗率に達すると、{currentArc.require_promotion_exam ? '昇格試験を受けられる' : 'このエリアが自動で解放される'}
                            </p>
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={currentArc.unlock_threshold}
                              onChange={(e) => updateEditingArc('unlock_threshold', Number(e.target.value))}
                              className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="w-24 text-center">
                              <span className="text-3xl font-bold text-[#E74C3C]">
                                {currentArc.unlock_threshold}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 昇格試験設定（昇格試験ONの場合のみ表示） */}
                        {currentArc.require_promotion_exam && (
                          <div className="border-2 border-[#F39C12] rounded-lg p-4 bg-yellow-50">
                            <h4 className="font-bold text-lg text-[#2C3E50] mb-4">
                              🎯 昇格試験の設定
                            </h4>

                            {/* 問題数 */}
                            <div className="mb-4">
                              <label className="block mb-2">
                                <span className="font-bold text-[#2C3E50]">
                                  📝 出題問題数
                                </span>
                              </label>
                              <select
                                value={currentArc.promotion_exam_question_count}
                                onChange={(e) => updateEditingArc('promotion_exam_question_count', Number(e.target.value))}
                                className="w-full px-4 py-3 border-2 border-[#95A5A6] rounded-lg focus:outline-none focus:border-[#3498DB] text-lg font-bold"
                              >
                                <option value={5}>5問</option>
                                <option value={10}>10問（推奨）</option>
                                <option value={15}>15問</option>
                                <option value={20}>20問</option>
                                <option value={30}>30問</option>
                              </select>
                            </div>

                            {/* 合格正答率 */}
                            <div>
                              <label className="block mb-2">
                                <span className="font-bold text-[#2C3E50]">
                                  ✅ 合格正答率
                                </span>
                              </label>
                              <div className="flex items-center gap-4">
                                <input
                                  type="range"
                                  min="50"
                                  max="100"
                                  step="5"
                                  value={currentArc.promotion_exam_pass_rate}
                                  onChange={(e) => updateEditingArc('promotion_exam_pass_rate', Number(e.target.value))}
                                  className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="w-24 text-center">
                                  <span className="text-3xl font-bold text-[#27AE60]">
                                    {currentArc.promotion_exam_pass_rate}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-[#7F8C8D] mt-2">
                                {currentArc.promotion_exam_question_count}問中{' '}
                                {Math.ceil((currentArc.promotion_exam_question_count * currentArc.promotion_exam_pass_rate) / 100)}問
                                正解で合格
                              </p>
                            </div>
                          </div>
                        )}

                        {/* ボタン */}
                        <div className="flex gap-4 justify-end pt-4 border-t-2 border-[#95A5A6]">
                          <button
                            onClick={handleCancel}
                            className="bg-[#95A5A6] hover:bg-[#7F8C8D] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#27AE60] hover:bg-[#229954] text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? '💾 保存中...' : '💾 保存する'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 表示モード */
                      <div className="space-y-4">
                        {/* 現在の設定表示 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 進捗率条件 */}
                          <div className="border-2 border-[#3498DB] rounded-lg p-4">
                            <div className="text-sm text-[#7F8C8D] mb-1">前エリア必要進捗率</div>
                            <div className="text-3xl font-bold text-[#3498DB]">
                              {arc.unlock_threshold}%
                            </div>
                          </div>

                          {/* 昇格試験の有無 */}
                          <div className={`border-2 rounded-lg p-4 ${
                            arc.require_promotion_exam 
                              ? 'border-[#F39C12] bg-yellow-50' 
                              : 'border-[#95A5A6] bg-gray-50'
                          }`}>
                            <div className="text-sm text-[#7F8C8D] mb-1">昇格試験</div>
                            <div className="text-2xl font-bold">
                              {arc.require_promotion_exam ? '🎓 必要' : '⚡ 不要（自動解放）'}
                            </div>
                          </div>
                        </div>

                        {/* 昇格試験詳細（ONの場合のみ） */}
                        {arc.require_promotion_exam && (
                          <div className="border-2 border-[#F39C12] rounded-lg p-4 bg-yellow-50">
                            <h4 className="font-bold text-lg text-[#2C3E50] mb-3">
                              🎯 昇格試験の詳細
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-[#7F8C8D] mb-1">出題問題数</div>
                                <div className="text-2xl font-bold text-[#E74C3C]">
                                  {arc.promotion_exam_question_count}問
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-[#7F8C8D] mb-1">合格正答率</div>
                                <div className="text-2xl font-bold text-[#27AE60]">
                                  {arc.promotion_exam_pass_rate}%
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-[#7F8C8D] mt-3">
                              {arc.promotion_exam_question_count}問中{' '}
                              {Math.ceil((arc.promotion_exam_question_count * arc.promotion_exam_pass_rate) / 100)}問
                              正解で合格
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 最初のエリア（編集不可） */}
                {arc.order_num === 1 && (
                  <div className="p-6 text-center text-[#7F8C8D]">
                    <p className="text-lg">
                      ⚓ このエリアは最初から解放されているため、設定変更できません
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}