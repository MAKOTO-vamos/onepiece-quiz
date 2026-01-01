'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Choice {
  text: string;
  is_correct: boolean;
}

interface QuestionData {
  story_arc_id: number;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation?: string;
  choices: Choice[];
}

interface ImportData {
  questions: QuestionData[];
}

export default function QuestionImport() {
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<ImportData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // JSONプレビュー
  const handlePreview = () => {
    setError('');
    setSuccess('');
    setPreview(null);

    try {
      const data = JSON.parse(jsonInput) as ImportData;
      
      // バリデーション
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('JSONフォーマットが正しくありません');
      }

      if (data.questions.length === 0) {
        throw new Error('問題が含まれていません');
      }

      // 各問題のバリデーション
      data.questions.forEach((q, index) => {
        if (!q.story_arc_id && q.story_arc_id !== 0) {
          throw new Error(`問題${index + 1}: story_arc_idが必要です`);
        }
        if (!q.question_text) {
          throw new Error(`問題${index + 1}: 問題文が必要です`);
        }
        if (!q.choices || q.choices.length < 2) {
          throw new Error(`問題${index + 1}: 2つ以上の選択肢が必要です`);
        }
        const correctCount = q.choices.filter(c => c.is_correct).length;
        if (correctCount !== 1) {
          throw new Error(`問題${index + 1}: 正解は1つだけにしてください`);
        }
      });

      setPreview(data);
      setSuccess(`${data.questions.length}件の問題をプレビュー中`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSONの解析に失敗しました');
    }
  };

  // データベースに一括登録
  const handleImport = async () => {
    if (!preview) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let importedCount = 0;

      for (const question of preview.questions) {
        // 1. 問題を登録
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({
            story_arc_id: question.story_arc_id,
            question_text: question.question_text,
            difficulty: question.difficulty,
            points: question.points,
            explanation: question.explanation || null,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (questionError) {
          console.error('Question insert error:', questionError);
          throw new Error(`問題の登録に失敗: ${questionError.message}`);
        }

        // 2. 選択肢を登録
        const choicesToInsert = question.choices.map((choice, index) => ({
          question_id: questionData.id,
          choice_text: choice.text,
          is_correct: choice.is_correct,
          order_num: index + 1,
        }));

        const { error: choicesError } = await supabase
          .from('choices')
          .insert(choicesToInsert);

        if (choicesError) {
          console.error('Choices insert error:', choicesError);
          throw new Error(`選択肢の登録に失敗: ${choicesError.message}`);
        }

        importedCount++;
      }

      setSuccess(`✅ ${importedCount}件の問題を登録しました！`);
      setJsonInput('');
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
            📝 問題一括インポート
          </h1>
          <p className="text-[#34495E] font-medium">
            GeminiディープリサーチでJSON生成 → ここに貼り付けて一括登録
          </p>
        </div>

        {/* JSON入力エリア */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
            ステップ1: JSONを貼り付け
          </h2>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-64 p-4 border-2 border-[#95A5A6] rounded-lg font-mono text-sm focus:outline-none focus:border-[#3498DB] text-[#2C3E50] bg-white"
            placeholder={`{
  "questions": [
    {
      "story_arc_id": 1,
      "question_text": "ルフィの懸賞金は最初いくら？",
      "difficulty": "easy",
      "points": 10,
      "explanation": "ルフィの最初の懸賞金は3000万ベリーです。",
      "choices": [
        { "text": "3000万ベリー", "is_correct": true },
        { "text": "5000万ベリー", "is_correct": false },
        { "text": "1億ベリー", "is_correct": false },
        { "text": "1000万ベリー", "is_correct": false }
      ]
    }
  ]
}`}
          />

          <button
            onClick={handlePreview}
            disabled={!jsonInput.trim()}
            className="mt-4 bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            👁️ プレビュー
          </button>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border-2 border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* プレビュー */}
        {preview && (
          <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6">
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
              ステップ2: プレビュー確認
            </h2>
            
            <div className="mb-4 p-4 bg-[#ECF0F1] rounded-lg">
              <p className="text-[#2C3E50]">
                <strong>問題数:</strong> {preview.questions.length}件
              </p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {preview.questions.map((q, index) => {
                const arcNames: { [key: number]: string } = {
                  0: '❓ 未分類',
                  1: '🌊 イーストブルー',
                  2: '🏜️ アラバスタ',
                  3: '☁️ スカイピア',
                  4: '🚢 ウォーターセブン',
                  5: '👻 スリラーバーク',
                  6: '🫧 シャボンディ諸島',
                  7: '⚔️ マリンフォード',
                  8: '🐠 魚人島',
                  9: '🔥 パンクハザード',
                  10: '🌹 ドレスローザ',
                  11: '🐘 ゾウ',
                  12: '🍰 ホールケーキアイランド',
                  13: '🗾 ワノ国',
                };
                
                return (
                  <div key={index} className="p-4 bg-[#F8F9FA] rounded-lg border-2 border-[#95A5A6]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="bg-[#E74C3C] text-white px-3 py-1 rounded-full text-sm font-bold">
                        問題 {index + 1}
                      </span>
                      <span className="bg-[#3498DB] text-white px-3 py-1 rounded-full text-sm font-bold">
                        {arcNames[q.story_arc_id] || `エリアID: ${q.story_arc_id}`}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        q.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
                        q.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="text-[#F39C12] font-bold">
                        +{q.points}pt
                      </span>
                    </div>
                    
                    <p className="text-[#2C3E50] font-bold mb-2">{q.question_text}</p>
                    
                    <div className="space-y-1">
                      {q.choices.map((c, cIndex) => (
                        <div key={cIndex} className={`p-2 rounded text-[#2C3E50] font-medium ${
                          c.is_correct ? 'bg-green-100 border-2 border-green-500' : 'bg-white border border-gray-300'
                        }`}>
                          {c.is_correct && '✅ '}{c.text}
                        </div>
                      ))}
                    </div>
                    
                    {q.explanation && (
                      <p className="mt-2 text-sm text-[#7F8C8D] italic">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleImport}
              disabled={loading}
              className="mt-6 w-full bg-[#27AE60] hover:bg-[#229954] text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? '📥 登録中...' : '📥 一括登録する'}
            </button>
          </div>
        )}

        {/* 使い方ガイド */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
            📖 使い方
          </h2>
          
          <ol className="space-y-3 text-[#2C3E50]">
            <li>
              <strong>1. Geminiディープリサーチで問題を生成</strong>
              <p className="text-sm text-[#34495E] ml-4">
                過去問PDFをアップロードして、上記のJSON形式で出力してもらう
              </p>
            </li>
            <li>
              <strong>2. JSONをコピーして貼り付け</strong>
              <p className="text-sm text-[#34495E] ml-4">
                生成されたJSONを上のテキストエリアに貼り付ける
              </p>
            </li>
            <li>
              <strong>3. プレビューで確認</strong>
              <p className="text-sm text-[#34495E] ml-4">
                問題の内容、エリア分類を確認する
              </p>
            </li>
            <li>
              <strong>4. 一括登録</strong>
              <p className="text-sm text-[#34495E] ml-4">
                問題なければ「一括登録する」ボタンをクリック
              </p>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-[#E8F5E9] rounded-lg border-2 border-[#4CAF50]">
            <p className="text-[#2C3E50] font-bold mb-2">💡 Geminiへのプロンプト例：</p>
            <p className="text-sm text-[#34495E] font-mono bg-white p-3 rounded">
              このPDFから10問のクイズ問題を生成してください。<br/>
              各問題がどのエリア（story_arc_id）に属するか自動判定してください。<br/>
              上記のJSON形式で出力してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}