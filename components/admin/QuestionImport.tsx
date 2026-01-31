'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { QuestionJSON } from '../../types/questions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ImportData {
  questions: QuestionJSON[];
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
      const parsed = JSON.parse(jsonInput);
      
      // 配列または { questions: [...] } 形式に対応
      let questions: QuestionJSON[];
      
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else {
        throw new Error('JSONは配列、または { questions: [...] } 形式である必要があります');
      }

      if (questions.length === 0) {
        throw new Error('問題が含まれていません');
      }

      // 各問題のバリデーション
      questions.forEach((q, index) => {
        if (q.story_arc_id === undefined || q.story_arc_id === null) {
          throw new Error(`問題${index + 1}: story_arc_idが必要です`);
        }
        if (!q.question_text) {
          throw new Error(`問題${index + 1}: 問題文が必要です`);
        }
        if (!q.question_format) {
          throw new Error(`問題${index + 1}: question_formatが必要です`);
        }

        // 問題形式別のバリデーション
        if (q.question_format === 'single_choice' || q.question_format === 'multiple_choice') {
          if (!('choices' in q) || !q.choices || q.choices.length < 2) {
            throw new Error(`問題${index + 1}: 2つ以上の選択肢が必要です`);
          }
        }
        
        if (q.question_format === 'ordering') {
          if (!('choices' in q) || !q.choices || !Array.isArray(q.choices) || q.choices.length < 2) {
            throw new Error(`問題${index + 1}: 2つ以上の選択肢が必要です`);
          }
          if (!('format_config' in q) || !q.format_config) {
            throw new Error(`問題${index + 1}: format_configが必要です`);
          }
          // すべてのchoiceにcorrect_positionがあるか確認
          type ChoiceWithPosition = { text: string; correct_position: number };
          const hasAllPositions = (q.choices as unknown as ChoiceWithPosition[]).every((choice) => 
            'correct_position' in choice && typeof choice.correct_position === 'number'
          );
          if (!hasAllPositions) {
            throw new Error(`問題${index + 1}: すべての選択肢にcorrect_positionが必要です`);
          }
        }
        
        if (q.question_format === 'free_text') {
          if (!('format_config' in q) || !q.format_config) {
            throw new Error(`問題${index + 1}: format_configが必要です`);
          }
          type FreeTextConfig = { correct_answers: string[] };
          const config = q.format_config as unknown as FreeTextConfig;
          if (!config.correct_answers || !Array.isArray(config.correct_answers)) {
            throw new Error(`問題${index + 1}: format_config.correct_answersが必要です`);
          }
        }
        
        if (q.question_format === 'numeric') {
          if (!('format_config' in q) || !q.format_config) {
            throw new Error(`問題${index + 1}: format_configが必要です`);
          }
          type NumericConfig = { correct_answer: number };
          const config = q.format_config as unknown as NumericConfig;
          if (typeof config.correct_answer !== 'number') {
            throw new Error(`問題${index + 1}: format_config.correct_answerが必要です`);
          }
        }
      });

      setPreview({ questions });
      setSuccess(`${questions.length}件の問題をプレビュー中`);
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
        try {
          await importQuestion(question, user?.id);
          importedCount++;
        } catch (e) {
          console.error('Question import error:', e);
          console.error('Question data:', question);
          if (e && typeof e === 'object' && 'message' in e) {
            throw new Error(`問題のインポート失敗: ${(e as Error).message}`);
          }
          throw e;
        }
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

  // 問題形式に応じて処理を分岐
  const importQuestion = async (question: QuestionJSON, userId?: string) => {
    const format = question.question_format;
    
    switch (format) {
      case 'single_choice':
        await importSingleChoice(question, userId);
        break;
      case 'multiple_choice':
        await importMultipleChoice(question, userId);
        break;
      case 'ordering':
        await importOrdering(question, userId);
        break;
      case 'free_text':
        await importFreeText(question, userId);
        break;
      case 'numeric':
        await importNumeric(question, userId);
        break;
      default:
        throw new Error(`未対応の問題形式: ${format}`);
    }
  };

  // 4択問題の取り込み
  const importSingleChoice = async (question: QuestionJSON, userId?: string) => {
    if (question.question_format !== 'single_choice' || !('choices' in question)) return;

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        story_arc_id: question.story_arc_id,
        question_format: 'single_choice',
        learning_mode: question.learning_mode || 'story_arc',
        knowledge_category: question.knowledge_category,
        question_text: question.question_text,
        difficulty: question.difficulty,
        points: question.points,
        explanation: question.explanation || null,
        created_by: userId || null,
        format_config: {},
      })
      .select()
      .single();

    if (questionError) {
      console.error('Question insert error:', questionError);
      console.error('Question data:', question);
      throw new Error(`4択問題の登録失敗: ${questionError.message}`);
    }

    const choices = question.choices.map((choice, index) => ({
      question_id: questionData.id,
      choice_text: choice.text,
      is_correct: choice.is_correct,
      order_num: index + 1,
    }));

    const { error: choicesError } = await supabase
      .from('choices')
      .insert(choices);

    if (choicesError) {
      console.error('Choices insert error:', choicesError);
      throw new Error(`選択肢の登録失敗: ${choicesError.message}`);
    }
  };

  // 複数選択問題の取り込み
  const importMultipleChoice = async (question: QuestionJSON, userId?: string) => {
    if (question.question_format !== 'multiple_choice' || !('choices' in question) || !('format_config' in question)) return;

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        story_arc_id: question.story_arc_id,
        question_format: 'multiple_choice',
        learning_mode: question.learning_mode || 'story_arc',
        knowledge_category: question.knowledge_category,
        question_text: question.question_text,
        difficulty: question.difficulty,
        points: question.points,
        explanation: question.explanation || null,
        created_by: userId || null,
        format_config: question.format_config,
      })
      .select()
      .single();

    if (questionError) throw questionError;

    const choices = question.choices.map((choice, index) => ({
      question_id: questionData.id,
      choice_text: choice.text,
      is_correct: choice.is_correct,
      order_num: index + 1,
    }));

    const { error: choicesError } = await supabase
      .from('choices')
      .insert(choices);

    if (choicesError) throw choicesError;
  };

  // 並べ替え問題の取り込み
  const importOrdering = async (question: QuestionJSON, userId?: string) => {
    if (question.question_format !== 'ordering' || !('format_config' in question)) return;

    type OrderingConfig = { ordering_criteria: string; partial_scoring: boolean };
    const config = question.format_config as unknown as OrderingConfig;

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        story_arc_id: question.story_arc_id,
        question_format: 'ordering',
        learning_mode: question.learning_mode || 'story_arc',
        knowledge_category: question.knowledge_category,
        question_text: question.question_text,
        difficulty: question.difficulty,
        points: question.points,
        explanation: question.explanation || null,
        created_by: userId || null,
        format_config: {
          ordering_criteria: config.ordering_criteria,
          partial_scoring: config.partial_scoring,
        },
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // choices配列から選択肢を作成
    if (!('choices' in question) || !question.choices || !Array.isArray(question.choices)) {
      throw new Error('ordering形式の問題にchoices配列が必要です');
    }

    type OrderingChoice = { text: string; correct_position: number };
    const choices = (question.choices as unknown as OrderingChoice[]).map((choice) => ({
      question_id: questionData.id,
      choice_text: choice.text,
      is_correct: false,
      order_num: 0,
      correct_position: choice.correct_position,
    }));

    const { error: choicesError } = await supabase
      .from('choices')
      .insert(choices);

    if (choicesError) throw choicesError;
  };

  // 自由記述問題の取り込み
  const importFreeText = async (question: QuestionJSON, userId?: string) => {
    if (question.question_format !== 'free_text' || !('format_config' in question)) return;

    const { error } = await supabase
      .from('questions')
      .insert({
        story_arc_id: question.story_arc_id,
        question_format: 'free_text',
        learning_mode: question.learning_mode || 'story_arc',
        knowledge_category: question.knowledge_category,
        question_text: question.question_text,
        difficulty: question.difficulty,
        points: question.points,
        explanation: question.explanation || null,
        created_by: userId || null,
        format_config: question.format_config,
      });

    if (error) throw error;
  };

  // 数値入力問題の取り込み
  const importNumeric = async (question: QuestionJSON, userId?: string) => {
    if (question.question_format !== 'numeric' || !('format_config' in question)) return;

    const { error } = await supabase
      .from('questions')
      .insert({
        story_arc_id: question.story_arc_id,
        question_format: 'numeric',
        learning_mode: question.learning_mode || 'story_arc',
        knowledge_category: question.knowledge_category,
        question_text: question.question_text,
        difficulty: question.difficulty,
        points: question.points,
        explanation: question.explanation || null,
        created_by: userId || null,
        format_config: question.format_config,
      });

    if (error) throw error;
  };

  // 問題形式のラベル
  const getFormatLabel = (format: string) => {
    const labels: Record<string, string> = {
      'single_choice': '📝 4択',
      'multiple_choice': '☑️ 複数選択',
      'ordering': '🔀 並べ替え',
      'free_text': '✍️ 自由記述',
      'numeric': '🔢 数値入力',
    };
    return labels[format] || format;
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2C3E50] mb-2">
            📝 問題一括インポート
          </h1>
          <p className="text-[#34495E] font-medium">
            全5形式対応 - GeminiディープリサーチでJSON生成 → ここに貼り付けて一括登録
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
      "question_format": "single_choice",
      "story_arc_id": 1,
      "learning_mode": "story_arc",
      "knowledge_category": "character",
      "question_text": "ルフィの悪魔の実は？",
      "difficulty": "easy",
      "points": 10,
      "explanation": "ゴムゴムの実です。",
      "choices": [
        { "text": "ゴムゴムの実", "is_correct": true },
        { "text": "メラメラの実", "is_correct": false }
      ]
    }
  ]
}

全体エリア: story_arc_id: -1
未分類: story_arc_id: 0
通常エリア: story_arc_id: 1〜15`}
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
                  '-1': '🌍 全体',
                  0: '❓ 未分類',
                  1: '🌊 イーストブルー',
                  2: '🏜️ アラバスタ',
                  3: '☁️ スカイピア',
                  4: '🚢 ウォーターセブン',
                  5: '👻 スリラーバーク',
                  6: '🫧 シャボンディ諸島〜女ヶ島',
                  7: '⚔️ インペルダウン〜頂上戦争',
                  8: '🐠 魚人島',
                  9: '🔥 パンクハザード',
                  10: '🌹 ドレスローザ',
                  11: '🐘 ゾウ',
                  12: '🍰 ホールケーキアイランド',
                  13: '🗾 ワノ国',
                  14: '🥚 エッグヘッド',
                  15: '⚔️ エルバフ',
                };
                
                return (
                  <div key={index} className="p-4 bg-[#F8F9FA] rounded-lg border-2 border-[#95A5A6]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="bg-[#E74C3C] text-white px-3 py-1 rounded-full text-sm font-bold">
                        問題 {index + 1}
                      </span>
                      <span className="bg-[#9B59B6] text-white px-3 py-1 rounded-full text-sm font-bold">
                        {getFormatLabel(q.question_format)}
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
                    
                    {/* 選択肢表示（4択・複数選択） */}
                    {(q.question_format === 'single_choice' || q.question_format === 'multiple_choice') && q.choices && (
                      <div className="space-y-1">
                        {q.choices.map((c, cIndex) => (
                          <div key={cIndex} className={`p-2 rounded text-[#2C3E50] font-medium ${
                            c.is_correct ? 'bg-green-100 border-2 border-green-500' : 'bg-white border border-gray-300'
                          }`}>
                            {c.is_correct && '✅ '}{c.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 並べ替え */}
                    {q.question_format === 'ordering' && q.format_config.items && (
                      <div className="space-y-1">
                        {q.format_config.items
                          .sort((a, b) => a.correct_position - b.correct_position)
                          .map((item, idx) => (
                            <div key={idx} className="p-2 rounded bg-blue-100 border border-blue-300 text-[#2C3E50] font-medium">
                              {item.correct_position}. {item.text}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* 自由記述 */}
                    {q.question_format === 'free_text' && (
                      <div className="p-2 rounded bg-green-100 border border-green-300 text-[#2C3E50]">
                        <strong>正解例:</strong> {q.format_config.correct_answers?.join(', ')}
                      </div>
                    )}

                    {/* 数値入力 */}
                    {q.question_format === 'numeric' && (
                      <div className="p-2 rounded bg-orange-100 border border-orange-300 text-[#2C3E50]">
                        <strong>正解:</strong> {q.format_config.correct_answer}{q.format_config.unit || ''}
                      </div>
                    )}
                    
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

        {/* 対応形式 */}
        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300 mb-6">
          <h3 className="font-bold text-yellow-900 mb-3">📋 対応する問題形式</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 📝 4択問題（single_choice）</li>
            <li>• ☑️ 複数選択（multiple_choice）</li>
            <li>• 🔀 並べ替え（ordering）</li>
            <li>• ✍️ 自由記述（free_text）</li>
            <li>• 🔢 数値入力（numeric）</li>
          </ul>
        </div>

        {/* 使い方ガイド */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
            📖 使い方
          </h2>
          
          <ol className="space-y-3 text-[#2C3E50]">
            <li>
              <strong>1. Geminiディープリサーチで問題を生成</strong>
              <p className="text-sm text-[#34495E] ml-4">
                過去問PDFをアップロードして、JSON形式で出力してもらう
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
                問題の内容、エリア分類、問題形式を確認する
              </p>
            </li>
            <li>
              <strong>4. 一括登録</strong>
              <p className="text-sm text-[#34495E] ml-4">
                問題なければ「一括登録する」ボタンをクリック
              </p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}