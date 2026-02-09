// app/admin/questions/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Choice {
  id: string; // 一時ID
  choice_text: string;
  is_correct: boolean;
  order_num: number;
}

const STORY_ARCS = [
  { id: 1, name: 'イーストブルー' },
  { id: 2, name: 'アラバスタ' },
  { id: 3, name: 'スカイピア' },
  { id: 4, name: 'ウォーターセブン' },
  { id: 5, name: 'スリラーバーク' },
  { id: 6, name: 'シャボンディ諸島〜女ヶ島' },
  { id: 7, name: 'インペルダウン〜頂上戦争' },
  { id: 8, name: '魚人島' },
  { id: 9, name: 'パンクハザード' },
  { id: 10, name: 'ドレスローザ' },
  { id: 11, name: 'ゾウ' },
  { id: 12, name: 'ホールケーキアイランド' },
  { id: 13, name: 'ワノ国' },
  { id: 14, name: 'エッグヘッド' },
  { id: 15, name: 'エルバフ' },
];

export default function CreateQuestionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // 基本情報
  const [questionFormat, setQuestionFormat] = useState<string>('single_choice');
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [storyArcId, setStoryArcId] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [points, setPoints] = useState<number>(10);

  // 選択肢（単一選択、複数選択、並べ替え用）
  const [choices, setChoices] = useState<Choice[]>([
    { id: '1', choice_text: '', is_correct: false, order_num: 1 },
    { id: '2', choice_text: '', is_correct: false, order_num: 2 },
    { id: '3', choice_text: '', is_correct: false, order_num: 3 },
    { id: '4', choice_text: '', is_correct: false, order_num: 4 },
  ]);

  // 記述問題用
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(['']);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [allowPartialMatch, setAllowPartialMatch] = useState(false);

  // 数値問題用
  const [correctNumber, setCorrectNumber] = useState<number | ''>('');
  const [unit, setUnit] = useState('');

  const addChoice = () => {
    const newId = String(choices.length + 1);
    setChoices([
      ...choices,
      { id: newId, choice_text: '', is_correct: false, order_num: choices.length + 1 }
    ]);
  };

  const removeChoice = (id: string) => {
    if (choices.length <= 2) {
      alert('選択肢は最低2つ必要です');
      return;
    }
    setChoices(choices.filter(c => c.id !== id));
  };

  const updateChoice = (id: string, field: keyof Choice, value: string | boolean | number) => {
    setChoices(choices.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const toggleCorrect = (id: string) => {
    if (questionFormat === 'single_choice') {
      // 単一選択: 1つだけ正解
      setChoices(choices.map(c => ({
        ...c,
        is_correct: c.id === id
      })));
    } else if (questionFormat === 'multiple_choice') {
      // 複数選択: 複数正解可能
      setChoices(choices.map(c => 
        c.id === id ? { ...c, is_correct: !c.is_correct } : c
      ));
    }
  };

  const addCorrectAnswer = () => {
    setCorrectAnswers([...correctAnswers, '']);
  };

  const removeCorrectAnswer = (index: number) => {
    if (correctAnswers.length <= 1) {
      alert('正解は最低1つ必要です');
      return;
    }
    setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
  };

  const updateCorrectAnswer = (index: number, value: string) => {
    setCorrectAnswers(correctAnswers.map((ans, i) => i === index ? value : ans));
  };

  const validateForm = (): boolean => {
    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return false;
    }

    if (questionFormat === 'single_choice' || questionFormat === 'multiple_choice') {
      if (choices.some(c => !c.choice_text.trim())) {
        alert('全ての選択肢を入力してください');
        return false;
      }
      if (!choices.some(c => c.is_correct)) {
        alert('正解を最低1つ選択してください');
        return false;
      }
    }

    if (questionFormat === 'ordering') {
      if (choices.some(c => !c.choice_text.trim())) {
        alert('全ての選択肢を入力してください');
        return false;
      }
    }

    if (questionFormat === 'free_text') {
      if (correctAnswers.every(ans => !ans.trim())) {
        alert('正解を最低1つ入力してください');
        return false;
      }
    }

    if (questionFormat === 'numeric') {
      if (correctNumber === '') {
        alert('正解の数値を入力してください');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // format_configを構築
      let formatConfig: Record<string, unknown> = {};

      if (questionFormat === 'free_text') {
        formatConfig = {
          correct_answers: correctAnswers.filter(ans => ans.trim()),
          case_sensitive: caseSensitive,
          allow_partial_match: allowPartialMatch,
        };
      } else if (questionFormat === 'numeric') {
        formatConfig = {
          correct_answer: Number(correctNumber),
          unit: unit,
        };
      }

      // 問題を保存
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          story_arc_id: storyArcId,
          question_text: questionText,
          question_format: questionFormat,
          difficulty: difficulty,
          points: points,
          explanation: explanation || null,
          format_config: Object.keys(formatConfig).length > 0 ? formatConfig : null,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // 選択肢を保存（選択式・並べ替え問題の場合）
      if (questionFormat === 'single_choice' || 
          questionFormat === 'multiple_choice' || 
          questionFormat === 'ordering') {
        
        const choicesToInsert = choices
          .filter(c => c.choice_text.trim())
          .map((c, index) => ({
            question_id: question.id,
            choice_text: c.choice_text,
            is_correct: questionFormat === 'ordering' ? false : c.is_correct,
            order_num: index + 1,
          }));

        const { error: choicesError } = await supabase
          .from('choices')
          .insert(choicesToInsert);

        if (choicesError) throw choicesError;
      }

      alert('問題を作成しました！');
      router.push('/admin/questions');

    } catch (error) {
      console.error('Error saving question:', error);
      alert('問題の作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/questions')}
            className="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-800">問題を作成</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ストーリーアーク *
              </label>
              <select
                value={storyArcId}
                onChange={(e) => setStoryArcId(Number(e.target.value))}
                className="w-full border-2 border-gray-300 rounded p-2"
              >
                {STORY_ARCS.map(arc => (
                  <option key={arc.id} value={arc.id}>{arc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                出題形式 *
              </label>
              <select
                value={questionFormat}
                onChange={(e) => setQuestionFormat(e.target.value)}
                className="w-full border-2 border-gray-300 rounded p-2"
              >
                <option value="single_choice">4択問題</option>
                <option value="multiple_choice">複数選択</option>
                <option value="ordering">並べ替え</option>
                <option value="free_text">記述問題</option>
                <option value="numeric">数値問題</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                難易度 *
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border-2 border-gray-300 rounded p-2"
              >
                <option value="easy">簡単</option>
                <option value="medium">普通</option>
                <option value="hard">難しい</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ポイント *
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full border-2 border-gray-300 rounded p-2"
                min="1"
              />
            </div>
          </div>

          {/* 問題文 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              問題文 *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full border-2 border-gray-300 rounded p-3 h-32"
              placeholder="問題文を入力してください"
            />
          </div>

          {/* 選択肢（単一選択・複数選択） */}
          {(questionFormat === 'single_choice' || questionFormat === 'multiple_choice') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  選択肢 * {questionFormat === 'multiple_choice' && '（複数選択可）'}
                </label>
                <button
                  onClick={addChoice}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  + 選択肢を追加
                </button>
              </div>
              <div className="space-y-2">
                {choices.map((choice) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <input
                      type={questionFormat === 'single_choice' ? 'radio' : 'checkbox'}
                      checked={choice.is_correct}
                      onChange={() => toggleCorrect(choice.id)}
                      className="w-5 h-5"
                    />
                    <input
                      type="text"
                      value={choice.choice_text}
                      onChange={(e) => updateChoice(choice.id, 'choice_text', e.target.value)}
                      className="flex-1 border-2 border-gray-300 rounded p-2"
                      placeholder={`選択肢 ${choice.order_num}`}
                    />
                    {choices.length > 2 && (
                      <button
                        onClick={() => removeChoice(choice.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 選択肢（並べ替え） */}
          {questionFormat === 'ordering' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  選択肢 *（上から順番に正解の順序を設定）
                </label>
                <button
                  onClick={addChoice}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  + 選択肢を追加
                </button>
              </div>
              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={choice.choice_text}
                      onChange={(e) => updateChoice(choice.id, 'choice_text', e.target.value)}
                      className="flex-1 border-2 border-gray-300 rounded p-2"
                      placeholder={`${index + 1}番目`}
                    />
                    {choices.length > 2 && (
                      <button
                        onClick={() => removeChoice(choice.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 記述問題 */}
          {questionFormat === 'free_text' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">
                    正解 *（複数設定可能）
                  </label>
                  <button
                    onClick={addCorrectAnswer}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    + 正解を追加
                  </button>
                </div>
                <div className="space-y-2">
                  {correctAnswers.map((ans, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ans}
                        onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                        className="flex-1 border-2 border-gray-300 rounded p-2"
                        placeholder={`正解パターン ${index + 1}`}
                      />
                      {correctAnswers.length > 1 && (
                        <button
                          onClick={() => removeCorrectAnswer(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">大文字小文字を区別</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowPartialMatch}
                    onChange={(e) => setAllowPartialMatch(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">部分一致を許可</span>
                </label>
              </div>
            </div>
          )}

          {/* 数値問題 */}
          {questionFormat === 'numeric' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  正解の数値 *
                </label>
                <input
                  type="number"
                  value={correctNumber}
                  onChange={(e) => setCorrectNumber(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border-2 border-gray-300 rounded p-2"
                  placeholder="例: 42"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  単位（任意）
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded p-2"
                  placeholder="例: 人、cm、kg"
                />
              </div>
            </div>
          )}

          {/* 解説 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              解説（任意）
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full border-2 border-gray-300 rounded p-3 h-24"
              placeholder="解説を入力してください"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded text-lg"
            >
              {saving ? '保存中...' : '問題を作成'}
            </button>
            <button
              onClick={() => router.push('/admin/questions')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded text-lg"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}