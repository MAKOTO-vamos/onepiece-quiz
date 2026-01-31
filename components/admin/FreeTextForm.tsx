// components/admin/FreeTextForm.tsx
'use client';

import { useState } from 'react';
import { FreeTextQuestionJSON, Difficulty, MatchingMode } from '../../types/questions';

interface FreeTextFormProps {
  onSubmit: (question: FreeTextQuestionJSON) => void;
  onCancel: () => void;
}

export default function FreeTextForm({ onSubmit, onCancel }: FreeTextFormProps) {
  const [questionText, setQuestionText] = useState('');
  const [storyArcId, setStoryArcId] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [explanation, setExplanation] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(['']);
  const [matchingMode, setMatchingMode] = useState<MatchingMode>('exact');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(true);

  // 難易度に応じたポイントを計算
  const getPoints = (diff: Difficulty): number => {
    switch (diff) {
      case 'easy': return 5;
      case 'medium': return 10;
      case 'hard': return 15;
      default: return 10;
    }
  };

  // 正解を追加
  const handleAddAnswer = () => {
    setCorrectAnswers([...correctAnswers, '']);
  };

  // 正解を削除
  const handleRemoveAnswer = (index: number) => {
    if (correctAnswers.length <= 1) {
      alert('正解は最低1つ必要です');
      return;
    }
    setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
  };

  // 正解のテキスト変更
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...correctAnswers];
    newAnswers[index] = value;
    setCorrectAnswers(newAnswers);
  };

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return;
    }

    const validAnswers = correctAnswers.filter(a => a.trim());
    if (validAnswers.length === 0) {
      alert('最低1つの正解を入力してください');
      return;
    }

    // 問題データを作成
    const questionData: FreeTextQuestionJSON = {
      question_format: 'free_text',
      story_arc_id: storyArcId,
      question_text: questionText,
      difficulty: difficulty,
      points: getPoints(difficulty),
      explanation: explanation,
      verified: true,
      ai_generated: false,
      format_config: {
        correct_answers: validAnswers,
        matching_mode: matchingMode,
        case_sensitive: caseSensitive,
        trim_whitespace: trimWhitespace,
        placeholder: placeholder || undefined,
      },
    };

    onSubmit(questionData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-[#2C3E50]">
        ✍️ 自由記述問題を作成
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
          placeholder="例: ルフィの悪魔の実の名前を答えよ"
        />
      </div>

      {/* プレースホルダー */}
      <div>
        <label className="block text-sm font-bold mb-2">
          💡 ヒント（プレースホルダー）
        </label>
        <input
          type="text"
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded-lg"
          placeholder="例: カタカナで入力してください"
        />
      </div>

      {/* 正解リスト */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold">
            ✅ 正解（許容される回答）
          </label>
          <button
            type="button"
            onClick={handleAddAnswer}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + 正解を追加
          </button>
        </div>

        <div className="space-y-3">
          {correctAnswers.map((answer, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                {index + 1}
              </span>
              <input
                type="text"
                value={answer}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                className="flex-1 p-3 border-2 border-gray-300 rounded-lg"
                placeholder={`正解パターン${index + 1}`}
              />
              {correctAnswers.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveAnswer(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* マッチングモード */}
      <div>
        <label className="block text-sm font-bold mb-2">
          🎯 採点方式
        </label>
        <select
          value={matchingMode}
          onChange={(e) => setMatchingMode(e.target.value as MatchingMode)}
          className="w-full p-3 border-2 border-gray-300 rounded-lg"
        >
          <option value="exact">完全一致</option>
          <option value="partial">部分一致</option>
          <option value="keywords">キーワードマッチング</option>
          <option value="regex">正規表現</option>
        </select>

        <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
          {matchingMode === 'exact' && '✓ 回答が正解と完全に一致する必要があります'}
          {matchingMode === 'partial' && '✓ 回答に正解が含まれていればOK'}
          {matchingMode === 'keywords' && '✓ すべてのキーワード（空白区切り）が含まれていればOK'}
          {matchingMode === 'regex' && '✓ 正規表現パターンでマッチング'}
        </div>
      </div>

      {/* 詳細設定 */}
      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
        <h3 className="font-bold text-blue-900 mb-3">⚙️ 詳細設定</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm font-bold">
              大文字小文字を区別する
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={trimWhitespace}
              onChange={(e) => setTrimWhitespace(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm font-bold">
              前後の空白を無視する
            </span>
          </label>
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