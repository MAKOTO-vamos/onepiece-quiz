'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type QuestionFormat = 'single_choice' | 'multiple_choice' | 'ordering' | 'free_text' | 'numeric';

interface Choice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  order_num: number;
}

interface FreeTextConfig {
  correct_answers?: string[];
  matching_mode?: string;
  case_sensitive?: boolean;
  trim_whitespace?: boolean;
  placeholder?: string;
}

interface NumericConfig {
  correct_answer?: number;
  unit?: string;
  acceptable_range?: {
    min?: number;
    max?: number;
  };
}

interface MultipleChoiceConfig {
  min_selections?: number;
  max_selections?: number;
  partial_scoring?: boolean;
}

interface OrderingConfig {
  items?: Array<{
    id: number;
    text: string;
    correct_position: number;
  }>;
}

type FormatConfig = FreeTextConfig | NumericConfig | MultipleChoiceConfig | OrderingConfig | Record<string, never>;

interface Question {
  id: number;
  story_arc_id: number;
  question_format: QuestionFormat;
  question_text: string;
  difficulty: string;
  points: number;
  explanation: string | null;
  format_config: FormatConfig;
  choices?: Choice[];
}

interface StoryArc {
  id: number;
  name: string;
  display_name: string;
  emoji: string;
}

const FORMAT_LABELS: Record<QuestionFormat, string> = {
  'single_choice': '📝 4択',
  'multiple_choice': '☑️ 複数選択',
  'ordering': '🔀 並べ替え',
  'free_text': '✍️ 自由記述',
  'numeric': '🔢 数値入力',
};

// 型ガードヘルパー関数
function getFreeTextConfig(config: FormatConfig): FreeTextConfig | null {
  if ('correct_answers' in config) {
    return config as FreeTextConfig;
  }
  return null;
}

function getNumericConfig(config: FormatConfig): NumericConfig | null {
  if ('correct_answer' in config) {
    return config as NumericConfig;
  }
  return null;
}

export default function QuestionEditorAllFormats() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [storyArcs, setStoryArcs] = useState<StoryArc[]>([]);
  const [filterArcId, setFilterArcId] = useState<number | null>(null);
  const [filterFormat, setFilterFormat] = useState<QuestionFormat | null>(null);
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

    if (filterFormat !== null) {
      query = query.eq('question_format', filterFormat);
    }

    const { data: questionsData } = await query;

    if (questionsData) {
      console.log('📊 取得した問題データ:', questionsData.length, '件');
      console.log('📋 最初の問題:', questionsData[0]);
      console.log('🎯 question_format:', questionsData[0]?.question_format);
      console.log('⚙️ format_config:', questionsData[0]?.format_config);
      setQuestions(questionsData as Question[]);
    }

    setLoading(false);
  }, [filterArcId, filterFormat]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 編集開始
  const handleEdit = (question: Question) => {
    console.log('✏️ 編集開始:', question);
    console.log('📋 question_format:', question.question_format);
    console.log('⚙️ format_config:', question.format_config);
    setEditingQuestion({ ...question });
    setMessage('');
  };

  // 保存
  const handleSave = async () => {
    if (!editingQuestion) return;

    setSaving(true);
    setMessage('');

    try {
      // 基本情報の更新
      const { error: questionError } = await supabase
        .from('questions')
        .update({
          story_arc_id: editingQuestion.story_arc_id,
          question_text: editingQuestion.question_text,
          difficulty: editingQuestion.difficulty,
          points: editingQuestion.points,
          explanation: editingQuestion.explanation,
          format_config: editingQuestion.format_config,
        })
        .eq('id', editingQuestion.id);

      if (questionError) throw questionError;

      // 選択肢の更新（4択・複数選択の場合）
      if (editingQuestion.choices && editingQuestion.choices.length > 0) {
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
      }

      setMessage('✅ 保存しました');
      setEditingQuestion(null);
      fetchData();
    } catch (error) {
      setMessage(`❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };

  // 削除
  const handleDelete = async (questionId: number) => {
    if (!confirm('本当に削除しますか？')) return;

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

  // 自由記述の正解を追加
  const handleAddFreeTextAnswer = () => {
    if (!editingQuestion || editingQuestion.question_format !== 'free_text') return;
    
    const config = editingQuestion.format_config as FreeTextConfig;
    const currentAnswers = config.correct_answers || [];
    setEditingQuestion({
      ...editingQuestion,
      format_config: {
        ...config,
        correct_answers: [...currentAnswers, ''],
      } as FreeTextConfig,
    });
  };

  // 自由記述の正解を削除
  const handleRemoveFreeTextAnswer = (index: number) => {
    if (!editingQuestion || editingQuestion.question_format !== 'free_text') return;
    
    const config = editingQuestion.format_config as FreeTextConfig;
    const currentAnswers = config.correct_answers || [];
    if (currentAnswers.length <= 1) {
      alert('正解は最低1つ必要です');
      return;
    }
    
    setEditingQuestion({
      ...editingQuestion,
      format_config: {
        ...config,
        correct_answers: currentAnswers.filter((_: string, i: number) => i !== index),
      } as FreeTextConfig,
    });
  };

  // 自由記述の正解を変更
  const handleChangeFreeTextAnswer = (index: number, value: string) => {
    if (!editingQuestion || editingQuestion.question_format !== 'free_text') return;
    
    const config = editingQuestion.format_config as FreeTextConfig;
    const currentAnswers = [...(config.correct_answers || [])];
    currentAnswers[index] = value;
    
    setEditingQuestion({
      ...editingQuestion,
      format_config: {
        ...config,
        correct_answers: currentAnswers,
      } as FreeTextConfig,
    });
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-[#2C3E50] mb-8">
          📝 問題編集（全形式対応）
        </h1>

        {/* フィルタ */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6 space-y-4">
          {/* エリアでフィルタ */}
          <div>
            <h2 className="text-xl font-bold text-[#2C3E50] mb-3">🗺️ エリアでフィルタ</h2>
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

          {/* 問題形式でフィルタ */}
          <div>
            <h2 className="text-xl font-bold text-[#2C3E50] mb-3">📋 問題形式でフィルタ</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  console.log('🔘 フィルタクリック: 全て');
                  setFilterFormat(null);
                }}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  filterFormat === null
                    ? 'bg-[#9B59B6] text-white'
                    : 'bg-gray-200 text-[#2C3E50] hover:bg-gray-300'
                }`}
              >
                全て
              </button>
              {(Object.keys(FORMAT_LABELS) as QuestionFormat[]).map(format => (
                <button
                  key={format}
                  onClick={() => {
                    console.log('🔘 フィルタクリック:', format);
                    setFilterFormat(format);
                  }}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                    filterFormat === format
                      ? 'bg-[#9B59B6] text-white'
                      : 'bg-gray-200 text-[#2C3E50] hover:bg-gray-300'
                  }`}
                >
                  {FORMAT_LABELS[format]}
                </button>
              ))}
            </div>
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

        {/* 問題リスト */}
        {loading ? (
          <div className="text-center py-8 text-[#2C3E50] font-bold">
            読み込み中...
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map(question => (
              <div
                key={question.id}
                className="bg-white p-6 rounded-lg shadow-lg border-2 border-[#95A5A6]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-[#E74C3C] text-white px-3 py-1 rounded-full text-sm font-bold">
                        ID: {question.id}
                      </span>
                      <span className="bg-[#9B59B6] text-white px-3 py-1 rounded-full text-sm font-bold">
                        {FORMAT_LABELS[question.question_format]}
                      </span>
                      <span className="bg-[#3498DB] text-white px-3 py-1 rounded-full text-sm font-bold">
                        {storyArcs.find(a => a.id === question.story_arc_id)?.emoji}{' '}
                        {storyArcs.find(a => a.id === question.story_arc_id)?.display_name}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        question.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="text-[#2C3E50] font-bold text-lg mb-2">
                      {question.question_text}
                    </p>
                    
                    {/* 形式別の情報表示 */}
                    {question.question_format === 'free_text' && (
                      <div className="text-sm text-gray-600 mt-2">
                        {(() => {
                          const freeTextConfig = getFreeTextConfig(question.format_config);
                          if (freeTextConfig?.correct_answers) {
                            return <><strong>正解:</strong> {freeTextConfig.correct_answers.join(', ')}</>;
                          }
                          return null;
                        })()}
                      </div>
                    )}
                    
                    {question.question_format === 'numeric' && (
                      <div className="text-sm text-gray-600 mt-2">
                        {(() => {
                          const numericConfig = getNumericConfig(question.format_config);
                          if (numericConfig?.correct_answer !== undefined) {
                            return (
                              <>
                                <strong>正解:</strong> {numericConfig.correct_answer}
                                {numericConfig.unit && ` ${numericConfig.unit}`}
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(question)}
                      className="px-4 py-2 bg-[#3498DB] text-white rounded-lg font-bold hover:bg-blue-600"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="px-4 py-2 bg-[#E74C3C] text-white rounded-lg font-bold hover:bg-red-600"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 編集モーダル */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#2C3E50]">
                  問題を編集 {FORMAT_LABELS[editingQuestion.question_format]}
                </h2>
                <span className="bg-[#E74C3C] text-white px-3 py-1 rounded-full text-sm font-bold">
                  ID: {editingQuestion.id}
                </span>
              </div>

              {/* エリア選択 */}
              <div className="mb-4">
                <label className="block text-[#2C3E50] font-bold mb-2">
                  エリア
                </label>
                <select
                  value={editingQuestion.story_arc_id}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    story_arc_id: parseInt(e.target.value)
                  })}
                  className="w-full p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                >
                  {storyArcs.map(arc => (
                    <option key={arc.id} value={arc.id}>
                      {arc.emoji} {arc.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 問題文 */}
              <div className="mb-4">
                <label className="block text-[#2C3E50] font-bold mb-2">
                  問題文
                </label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    question_text: e.target.value
                  })}
                  className="w-full h-24 p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                />
              </div>

              {/* 難易度・ポイント */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[#2C3E50] font-bold mb-2">
                    難易度
                  </label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      difficulty: e.target.value
                    })}
                    className="w-full p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#2C3E50] font-bold mb-2">
                    ポイント
                  </label>
                  <input
                    type="number"
                    value={editingQuestion.points}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      points: parseInt(e.target.value) || 0
                    })}
                    className="w-full p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                  />
                </div>
              </div>

              {/* 自由記述の正解編集 */}
              {editingQuestion.question_format === 'free_text' && (
                <div className="mb-4">
                  {(() => {
                    const freeTextConfig = getFreeTextConfig(editingQuestion.format_config);
                    const correctAnswers = freeTextConfig?.correct_answers || [];
                    
                    return (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[#2C3E50] font-bold">
                            ✍️ 正解パターン
                          </label>
                          <button
                            type="button"
                            onClick={handleAddFreeTextAnswer}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold"
                          >
                            + 追加
                          </button>
                        </div>
                        <div className="space-y-2">
                          {correctAnswers.map((answer: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                                {index + 1}
                              </span>
                              <input
                                type="text"
                                value={answer}
                                onChange={(e) => handleChangeFreeTextAnswer(index, e.target.value)}
                                className="flex-1 p-2 border-2 border-gray-300 rounded"
                                placeholder={`正解パターン${index + 1}`}
                              />
                              {correctAnswers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFreeTextAnswer(index)}
                                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                >
                                  削除
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 数値入力の正解編集 */}
              {editingQuestion.question_format === 'numeric' && (
                <div className="mb-4">
                  {(() => {
                    const numericConfig = getNumericConfig(editingQuestion.format_config);
                    
                    return (
                      <>
                        <label className="block text-[#2C3E50] font-bold mb-2">
                          🔢 正解
                        </label>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <input
                              type="number"
                              value={numericConfig?.correct_answer || 0}
                              onChange={(e) => setEditingQuestion({
                                ...editingQuestion,
                                format_config: {
                                  ...numericConfig,
                                  correct_answer: parseInt(e.target.value) || 0,
                                } as NumericConfig,
                              })}
                              className="w-full p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                              placeholder="正解の数値"
                            />
                          </div>
                          <div className="w-1/3">
                            <input
                              type="text"
                              value={numericConfig?.unit || ''}
                              onChange={(e) => setEditingQuestion({
                                ...editingQuestion,
                                format_config: {
                                  ...numericConfig,
                                  unit: e.target.value,
                                } as NumericConfig,
                              })}
                              className="w-full p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                              placeholder="単位（例: 回）"
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 選択肢編集（4択・複数選択） */}
              {(editingQuestion.question_format === 'single_choice' || 
                editingQuestion.question_format === 'multiple_choice') && 
               editingQuestion.choices && (
                <div className="mb-4">
                  <label className="block text-[#2C3E50] font-bold mb-2">
                    選択肢
                  </label>
                  <div className="space-y-2">
                    {editingQuestion.choices.map((choice, index) => (
                      <div key={choice.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={choice.is_correct}
                          onChange={(e) => {
                            const newChoices = [...editingQuestion.choices!];
                            newChoices[index].is_correct = e.target.checked;
                            setEditingQuestion({
                              ...editingQuestion,
                              choices: newChoices
                            });
                          }}
                          className="w-5 h-5"
                        />
                        <input
                          type="text"
                          value={choice.choice_text}
                          onChange={(e) => {
                            const newChoices = [...editingQuestion.choices!];
                            newChoices[index].choice_text = e.target.value;
                            setEditingQuestion({
                              ...editingQuestion,
                              choices: newChoices
                            });
                          }}
                          className="flex-1 p-2 border-2 border-gray-300 rounded"
                        />
                        <span className={`px-2 py-1 rounded text-sm font-bold ${
                          choice.is_correct 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {choice.is_correct ? '正解' : '不正解'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 解説 */}
              <div className="mb-6">
                <label className="block text-[#2C3E50] font-bold mb-2">
                  解説
                </label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    explanation: e.target.value
                  })}
                  className="w-full h-24 p-3 border-2 border-[#95A5A6] rounded-lg text-[#2C3E50] bg-white font-medium"
                  placeholder="解説を入力（任意）"
                />
              </div>

              {/* ボタン */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#27AE60] text-white rounded-lg font-bold hover:bg-green-600 disabled:bg-gray-400"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="flex-1 py-3 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-500"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}