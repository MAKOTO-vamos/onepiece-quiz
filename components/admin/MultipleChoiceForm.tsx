// components/admin/MultipleChoiceForm.tsx
'use client';

import { useState } from 'react';
// 相対パスでインポート
import { MultipleChoiceQuestionJSON, Difficulty } from '../../types/questions';

interface Choice {
  text: string;
  is_correct: boolean;
}

interface MultipleChoiceFormProps {
  onSubmit: (question: MultipleChoiceQuestionJSON) => void;
  onCancel: () => void;
}

export default function MultipleChoiceForm({ onSubmit, onCancel }: MultipleChoiceFormProps) {
  const [questionText, setQuestionText] = useState('');
  const [storyArcId, setStoryArcId] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [explanation, setExplanation] = useState('');
  const [choices, setChoices] = useState<Choice[]>([
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ]);
  const [minSelections, setMinSelections] = useState(1);
  const [maxSelections, setMaxSelections] = useState(4);
  const [partialScoring, setPartialScoring] = useState(false);

  // 難易度に応じたポイントを計算
  const getPoints = (diff: Difficulty): number => {
    switch (diff) {
      case 'easy': return 5;
      case 'medium': return 10;
      case 'hard': return 15;
      default: return 10;
    }
  };

  // 選択肢のテキスト変更
  const handleChoiceTextChange = (index: number, text: string) => {
    const newChoices = [...choices];
    newChoices[index].text = text;
    setChoices(newChoices);
  };

  // 正解のトグル
  const handleToggleCorrect = (index: number) => {
    const newChoices = [...choices];
    newChoices[index].is_correct = !newChoices[index].is_correct;
    setChoices(newChoices);
  };

  // 選択肢を追加
  const handleAddChoice = () => {
    setChoices([...choices, { text: '', is_correct: false }]);
  };

  // 選択肢を削除
  const handleRemoveChoice = (index: number) => {
    if (choices.length <= 2) {
      alert('選択肢は最低2つ必要です');
      return;
    }
    const newChoices = choices.filter((_, i) => i !== index);
    setChoices(newChoices);
  };

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return;
    }

    if (choices.some(c => !c.text.trim())) {
      alert('全ての選択肢を入力してください');
      return;
    }

    const correctCount = choices.filter(c => c.is_correct).length;
    if (correctCount === 0) {
      alert('少なくとも1つの正解を選択してください');
      return;
    }

    if (correctCount === choices.length) {
      alert('全てを正解にすることはできません');
      return;
    }

    // 問題データを作成
    const questionData: MultipleChoiceQuestionJSON = {
      question_format: 'multiple_choice',
      story_arc_id: storyArcId,
      question_text: questionText,
      difficulty: difficulty,
      points: getPoints(difficulty),
      explanation: explanation,
      verified: true,
      ai_generated: false,
      format_config: {
        min_selections: minSelections,
        max_selections: maxSelections,
        partial_scoring: partialScoring,
      },
      choices: choices.map(c => ({
        text: c.text,
        is_correct: c.is_correct,
      })),
    };

    onSubmit(questionData);
  };

  // 正解の数をカウント
  const correctCount = choices.filter(c => c.is_correct).length;

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-[#2C3E50]">
        ✍️ 複数選択問題を作成
      </h2>

      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-2">
            エリア
          </label>
          <select
            value={storyArcId}
            onChange={(e) => setStoryArcId(Number(e.target.value))}
            className="w-full p-3 border-2 border-gray-300 rounded-lg"
          >
            <option value={0}>未分類</option>
            <option value={1}>🌊 東の海編</option>
            <option value={2}>🏜️ アラバスタ編</option>
            <option value={3}>☁️ 空島編</option>
            <option value={4}>🚢 ウォーターセブン編</option>
            <option value={5}>👻 スリラーバーク編</option>
            <option value={6}>⚔️ 頂上戦争編</option>
            <option value={7}>🐠 魚人島編</option>
            <option value={8}>🔥 パンクハザード編</option>
            <option value={9}>🌹 ドレスローザ／ゾウ編</option>
            <option value={10}>🍰 ホールケーキアイランド編</option>
            <option value={11}>🗾 ワノ国編</option>
            <option value={12}>🥚 エッグヘッド編</option>
            <option value={13}>🗿 エルバフ編</option>
            <option value={-1}>🌍 全体</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">
            難易度
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg"
          >
            <option value="easy">Easy（簡単）- 5pt</option>
            <option value="medium">Medium（普通）- 10pt</option>
            <option value="hard">Hard（難しい）- 15pt</option>
          </select>
        </div>
      </div>

      {/* 問題文 */}
      <div>
        <label className="block text-sm font-bold mb-2">
          📝 問題文
        </label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
          className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg"
          placeholder="例: 麦わらの一味を全て選べ"
        />
      </div>

      {/* 選択肢 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold">
            ✅ 選択肢（正解: {correctCount}個）
          </label>
          <button
            type="button"
            onClick={handleAddChoice}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + 選択肢を追加
          </button>
        </div>

        <div className="space-y-3">
          {choices.map((choice, index) => (
            <div
              key={index}
              className={`
                p-4 rounded-lg border-2
                ${choice.is_correct 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-gray-50 border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* チェックボックス */}
                <input
                  type="checkbox"
                  checked={choice.is_correct}
                  onChange={() => handleToggleCorrect(index)}
                  className="w-5 h-5 text-green-600 rounded"
                />

                {/* 選択肢番号 */}
                <span className="font-bold text-gray-700 w-8">
                  {index + 1}.
                </span>

                {/* テキスト入力 */}
                <input
                  type="text"
                  value={choice.text}
                  onChange={(e) => handleChoiceTextChange(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded"
                  placeholder={`選択肢${index + 1}`}
                />

                {/* 削除ボタン */}
                {choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChoice(index)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 mt-2">
          💡 チェックボックスで正解を選択してください（複数選択可）
        </p>
      </div>

      {/* 詳細設定 */}
      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
        <h3 className="font-bold text-blue-900 mb-3">⚙️ 詳細設定</h3>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-sm font-bold mb-2">
              最低選択数
            </label>
            <input
              type="number"
              value={minSelections}
              onChange={(e) => setMinSelections(Number(e.target.value))}
              min={1}
              max={correctCount}
              className="w-full p-2 border-2 border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              最大選択数
            </label>
            <input
              type="number"
              value={maxSelections}
              onChange={(e) => setMaxSelections(Number(e.target.value))}
              min={correctCount}
              max={choices.length}
              className="w-full p-2 border-2 border-gray-300 rounded"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={partialScoring}
              onChange={(e) => setPartialScoring(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm font-bold">
              部分点を有効にする
            </span>
          </label>
          <p className="text-xs text-gray-600 ml-7 mt-1">
            一部正解の場合に部分点を付与します
          </p>
        </div>
      </div>

      {/* 解説 */}
      <div>
        <label className="block text-sm font-bold mb-2">
          💡 解説
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className="w-full p-4 border-2 border-gray-300 rounded-lg"
          placeholder="正解の解説を入力してください"
        />
      </div>

      {/* ボタン */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-6 bg-gray-300 text-gray-800 rounded-lg font-bold hover:bg-gray-400"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="flex-1 py-3 px-6 bg-[#B22222] text-white rounded-lg font-bold hover:bg-red-700"
        >
          問題を作成
        </button>
      </div>
    </form>
  );
}