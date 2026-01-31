'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Choice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  order_num: number;
}

interface Question {
  id: number;
  story_arc_id: number;
  question_text: string;
  difficulty: string;
  points: number;
  explanation: string | null;
  choices: Choice[];
}

interface StoryArc {
  id: number;
  name: string;
  display_name: string;
  emoji: string;
}

export default function QuestionEditor() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [storyArcs, setStoryArcs] = useState<StoryArc[]>([]);
  const [filterArcId, setFilterArcId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);

    // story_arcs取得
    const { data: arcs } = await supabase
      .from('story_arcs')
      .select('*')
      .order('order_num');
    
    if (arcs) setStoryArcs(arcs);

    // questions取得
    let query = supabase
      .from('questions')
      .select(`
        *,
        choices (*)
      `)
      .order('id', { ascending: false });

    if (filterArcId !== null) {
      query = query.eq('story_arc_id', filterArcId);
    }

    const { data: questionsData } = await query;

    if (questionsData) {
      setQuestions(questionsData as Question[]);
    }

    setLoading(false);
  }, [filterArcId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 編集開始
  const handleEdit = (question: Question) => {
    setEditingQuestion({ ...question });
    setMessage('');
  };

  // story_arc_id変更
  const handleArcChange = (newArcId: number) => {
    if (editingQuestion) {
      setEditingQuestion({
        ...editingQuestion,
        story_arc_id: newArcId,
      });
    }
  };

  // 選択肢のテキスト変更
  const handleChoiceTextChange = (choiceId: number, newText: string) => {
    if (!editingQuestion) return;
    
    setEditingQuestion({
      ...editingQuestion,
      choices: editingQuestion.choices.map(choice =>
        choice.id === choiceId
          ? { ...choice, choice_text: newText }
          : choice
      ),
    });
  };

  // 選択肢の正解/不正解切り替え
  const handleToggleCorrect = (choiceId: number) => {
    if (!editingQuestion) return;
    
    setEditingQuestion({
      ...editingQuestion,
      choices: editingQuestion.choices.map(choice =>
        choice.id === choiceId
          ? { ...choice, is_correct: !choice.is_correct }
          : choice
      ),
    });
  };

  // 保存
  const handleSave = async () => {
    if (!editingQuestion) return;

    setSaving(true);
    setMessage('');

    try {
      // 問題を更新
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          story_arc_id: editingQuestion.story_arc_id,
          question_text: editingQuestion.question_text,
          difficulty: editingQuestion.difficulty,
          points: editingQuestion.points,
          explanation: editingQuestion.explanation,
        })
        .eq('id', editingQuestion.id);

      if (updateError) throw updateError;

      // 選択肢を更新
      for (const choice of editingQuestion.choices) {
        const { error: choiceError } = await supabase
          .from('choices')
          .update({
            choice_text: choice.choice_text,
            is_correct: choice.is_correct,
          })
          .eq('id', choice.id);

        if (choiceError) throw choiceError;
      }

      setMessage('✅ 保存しました');
      setEditingQuestion(null);
      fetchData(); // データ再取得
    } catch (error) {
      setMessage(`❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };

  // キャンセル
  const handleCancel = () => {
    setEditingQuestion(null);
    setMessage('');
  };

  // 削除
  const handleDelete = async (questionId: number) => {
    if (!confirm('この問題を削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setMessage('✅ 削除しました');
      fetchData();
    } catch (error) {
      setMessage(`❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-[#2C3E50] mb-8">
          📝 問題編集
        </h1>

        {/* フィルタ */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6">
          <h2 className="text-xl font-bold text-[#2C3E50] mb-4">エリアでフィルタ</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterArcId(null)}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                filterArcId === null
                  ? 'bg-[#3498DB] text-white'
                  : 'bg-gray-200 text-[#2C3E50] hover:bg-gray-300'
              }`}
            >
              全て
            </button>
            {storyArcs.map(arc => (
              <button
                key={arc.id}
                onClick={() => setFilterArcId(arc.id)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  filterArcId === arc.id
                    ? 'bg-[#3498DB] text-white'
                    : 'bg-gray-200 text-[#2C3E50] hover:bg-gray-300'
                }`}
              >
                {arc.emoji} {arc.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg font-bold ${
            message.startsWith('✅')
              ? 'bg-green-100 text-green-700 border-2 border-green-400'
              : 'bg-red-100 text-red-700 border-2 border-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* 編集モーダル */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
              <h2 className="text-3xl font-bold text-[#2C3E50] mb-6">
                問題を編集
              </h2>

              {/* エリア選択 */}
              <div className="mb-6">
                <label className="block text-[#2C3E50] font-bold mb-2 text-lg">
                  エリア
                </label>
                <select
                  value={editingQuestion.story_arc_id}
                  onChange={(e) => handleArcChange(parseInt(e.target.value))}
                  className="w-full p-4 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium text-lg"
                >
                  {storyArcs.map(arc => (
                    <option key={arc.id} value={arc.id}>
                      {arc.emoji} {arc.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 問題文 */}
              <div className="mb-6">
                <label className="block text-[#2C3E50] font-bold mb-2 text-lg">
                  問題文
                </label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    question_text: e.target.value
                  })}
                  className="w-full h-32 p-4 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium text-lg leading-relaxed"
                />
              </div>

              {/* 難易度・ポイント */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-[#2C3E50] font-bold mb-2 text-lg">
                    難易度
                  </label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      difficulty: e.target.value
                    })}
                    className="w-full p-4 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium text-lg"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#2C3E50] font-bold mb-2 text-lg">
                    ポイント
                  </label>
                  <input
                    type="number"
                    value={editingQuestion.points}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      points: parseInt(e.target.value) || 0
                    })}
                    className="w-full p-4 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium text-lg"
                  />
                </div>
              </div>

              {/* 解説 */}
              <div className="mb-6">
                <label className="block text-[#2C3E50] font-bold mb-2 text-lg">
                  解説
                </label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    explanation: e.target.value
                  })}
                  className="w-full h-24 p-4 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium text-lg leading-relaxed"
                />
              </div>

              {/* 選択肢編集 */}
              <div className="mb-8">
                <label className="block text-[#2C3E50] font-bold mb-3 text-lg">
                  選択肢（クリックで正解/不正解を切り替え）
                </label>
                <div className="space-y-3">
                  {editingQuestion.choices
                    ?.sort((a, b) => a.order_num - b.order_num)
                    .map((choice, index) => (
                      <div key={choice.id} className="relative">
                        {/* 選択肢番号と正解マーク */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[#2C3E50] font-bold text-lg">
                            選択肢{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleCorrect(choice.id)}
                            className={`px-4 py-1 rounded-full font-bold text-sm transition-colors ${
                              choice.is_correct
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                            }`}
                          >
                            {choice.is_correct ? '✅ 正解' : '⭕ 不正解'}
                          </button>
                        </div>
                        
                        {/* 選択肢テキスト入力 */}
                        <textarea
                          value={choice.choice_text}
                          onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                          className={`w-full p-4 rounded-lg font-medium text-lg leading-relaxed transition-all ${
                            choice.is_correct
                              ? 'bg-green-50 border-3 border-green-500 text-green-900'
                              : 'bg-gray-50 border-2 border-gray-300 text-gray-900'
                          }`}
                          rows={2}
                        />
                      </div>
                    ))}
                </div>
              </div>

              {/* ボタン */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#27AE60] hover:bg-[#229954] text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 text-lg"
                >
                  {saving ? '保存中...' : '💾 保存'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  ❌ キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 問題一覧 */}
        {loading ? (
          <div className="text-center py-12 text-[#2C3E50] font-bold text-xl">
            読み込み中...
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[#2C3E50] font-bold mb-4 text-lg">
              {questions.length}件の問題
            </p>
            {questions.map((question) => {
              const arc = storyArcs.find(a => a.id === question.story_arc_id);
              return (
                <div
                  key={question.id}
                  className="bg-white p-6 rounded-lg shadow-lg border-2 border-[#95A5A6]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#E74C3C] text-white px-3 py-1 rounded-full text-sm font-bold">
                        ID: {question.id}
                      </span>
                      <span className="bg-[#3498DB] text-white px-3 py-1 rounded-full text-sm font-bold">
                        {arc?.emoji} {arc?.display_name}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        question.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {question.difficulty}
                      </span>
                      <span className="text-[#F39C12] font-bold">
                        +{question.points}pt
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(question)}
                        className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="bg-[#E74C3C] hover:bg-[#C0392B] text-white font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>

                  <p className="text-[#2C3E50] font-bold mb-3 text-lg">
                    {question.question_text}
                  </p>

                  <div className="space-y-2 mb-3">
                    {question.choices
                      ?.sort((a, b) => a.order_num - b.order_num)
                      .map((choice) => (
                        <div
                          key={choice.id}
                          className={`p-3 rounded-lg font-medium text-base ${
                            choice.is_correct
                              ? 'bg-green-100 border-2 border-green-500 text-green-900'
                              : 'bg-white border border-gray-300 text-gray-800'
                          }`}
                        >
                          {choice.is_correct && '✅ '}{choice.choice_text}
                        </div>
                      ))}
                  </div>

                  {question.explanation && (
                    <p className="text-sm text-[#7F8C8D] italic">
                      💡 {question.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}