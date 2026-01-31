// components/admin/OrderingForm.tsx
'use client';

import { useState } from 'react';
import { OrderingQuestionJSON, Difficulty } from '../../types/questions';

interface OrderingItem {
  text: string;
  correct_position: number;
}

interface OrderingFormProps {
  onSubmit: (question: OrderingQuestionJSON) => void;
  onCancel: () => void;
}

export default function OrderingForm({ onSubmit, onCancel }: OrderingFormProps) {
  const [questionText, setQuestionText] = useState('');
  const [storyArcId, setStoryArcId] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [explanation, setExplanation] = useState('');
  const [orderingCriteria, setOrderingCriteria] = useState('時系列順');
  const [partialScoring, setPartialScoring] = useState(true);
  const [items, setItems] = useState<OrderingItem[]>([
    { text: '', correct_position: 1 },
    { text: '', correct_position: 2 },
    { text: '', correct_position: 3 },
    { text: '', correct_position: 4 },
  ]);

  // 難易度に応じたポイントを計算
  const getPoints = (diff: Difficulty): number => {
    switch (diff) {
      case 'easy': return 5;
      case 'medium': return 10;
      case 'hard': return 15;
      default: return 10;
    }
  };

  // アイテムのテキスト変更
  const handleItemTextChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index].text = text;
    setItems(newItems);
  };

  // アイテムを追加
  const handleAddItem = () => {
    setItems([...items, { text: '', correct_position: items.length + 1 }]);
  };

  // アイテムを削除
  const handleRemoveItem = (index: number) => {
    if (items.length <= 2) {
      alert('アイテムは最低2つ必要です');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    // 順序を再計算
    newItems.forEach((item, i) => {
      item.correct_position = i + 1;
    });
    setItems(newItems);
  };

  // アイテムを上に移動
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1]!, newItems[index]!];
    // 順序を再計算
    newItems.forEach((item, i) => {
      item.correct_position = i + 1;
    });
    setItems(newItems);
  };

  // アイテムを下に移動
  const moveItemDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1]!, newItems[index]!];
    // 順序を再計算
    newItems.forEach((item, i) => {
      item.correct_position = i + 1;
    });
    setItems(newItems);
  };

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return;
    }

    if (items.some(item => !item.text.trim())) {
      alert('全てのアイテムを入力してください');
      return;
    }

    if (!orderingCriteria.trim()) {
      alert('並べ替え基準を入力してください');
      return;
    }

    // 問題データを作成
    const questionData: OrderingQuestionJSON = {
      question_format: 'ordering',
      story_arc_id: storyArcId,
      question_text: questionText,
      difficulty: difficulty,
      points: getPoints(difficulty),
      explanation: explanation,
      verified: true,
      ai_generated: false,
      format_config: {
        ordering_criteria: orderingCriteria,
        partial_scoring: partialScoring,
        items: items.map((item, index) => ({
          id: index + 1,
          text: item.text,
          correct_position: index + 1,
        })),
      },
    };

    onSubmit(questionData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-[#2C3E50]">
        🔀 並べ替え問題を作成
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
          placeholder="例: 次の出来事を時系列順に並べ替えよ"
        />
      </div>

      {/* 並べ替え基準 */}
      <div>
        <label className="block text-sm font-bold mb-2">
          📊 並べ替え基準
        </label>
        <input
          type="text"
          value={orderingCriteria}
          onChange={(e) => setOrderingCriteria(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded-lg"
          placeholder="例: 時系列順、強さ順、使用順"
        />
      </div>

      {/* アイテムリスト */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold">
            📋 アイテムリスト（正解の順序）
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + アイテムを追加
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border-2 border-gray-300 bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {/* 順序番号 */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3498DB] text-white flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>

                {/* テキスト入力 */}
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleItemTextChange(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded"
                  placeholder={`アイテム${index + 1}`}
                />

                {/* 移動ボタン */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveItemUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItemDown(index)}
                    disabled={index === items.length - 1}
                    className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
                  >
                    ⬇️
                  </button>
                </div>

                {/* 削除ボタン */}
                {items.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
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
          💡 ⬆️⬇️ボタンで正解の順序を調整してください
        </p>
      </div>

      {/* 詳細設定 */}
      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
        <h3 className="font-bold text-blue-900 mb-3">⚙️ 詳細設定</h3>

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
            隣接ペアの正解率に応じて部分点を付与します
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