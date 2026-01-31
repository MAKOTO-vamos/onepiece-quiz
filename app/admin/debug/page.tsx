'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QuestionData {
  id: number;
  question_format?: string;
  question_text: string;
  format_config?: {
    correct_answers?: string[];
    correct_answer?: number;
    unit?: string;
  };
}

export default function QuestionDebugPage() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log('🔍 データ取得開始...');
        
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('id', { ascending: false })
          .limit(10);

        if (error) {
          console.error('❌ エラー:', error);
          setError(error.message);
          return;
        }

        console.log('✅ データ取得成功:', data?.length, '件');
        console.log('📋 最初の問題:', data?.[0]);
        console.log('🎯 question_format:', data?.[0]?.question_format);
        console.log('⚙️ format_config:', data?.[0]?.format_config);

        setQuestions((data as QuestionData[]) || []);
      } catch (e) {
        console.error('💥 例外発生:', e);
        setError(e instanceof Error ? e.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">🔍 問題データ診断ページ</h1>

        {loading && (
          <div className="text-center py-8">
            <p className="text-xl">読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 p-4 rounded mb-4">
            <h2 className="font-bold">❌ エラー</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-6 p-4 bg-blue-100 border-2 border-blue-400 rounded">
              <h2 className="font-bold text-lg mb-2">📊 取得結果</h2>
              <p><strong>件数:</strong> {questions.length}件</p>
              <p className="text-sm text-gray-600 mt-2">
                ※ ブラウザのコンソール（F12）でより詳細なログを確認できます
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="border-2 border-gray-300 rounded p-4">
                  <div className="flex gap-2 mb-2">
                    <span className="bg-purple-500 text-white px-2 py-1 rounded text-sm font-bold">
                      ID: {q.id}
                    </span>
                    <span className={`px-2 py-1 rounded text-sm font-bold ${
                      q.question_format 
                        ? 'bg-green-200 text-green-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {q.question_format || '❌ undefined'}
                    </span>
                  </div>

                  <p className="font-bold mb-2">{q.question_text}</p>

                  <div className="bg-gray-50 p-3 rounded mt-2">
                    <p className="text-sm font-bold mb-1">format_config:</p>
                    {q.format_config ? (
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(q.format_config, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-red-600">❌ null または undefined</p>
                    )}
                  </div>

                  {/* 自由記述の正解表示 */}
                  {q.question_format === 'free_text' && q.format_config?.correct_answers && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded">
                      <p className="text-sm font-bold text-green-800">✅ 正解:</p>
                      <ul className="text-sm text-green-700 ml-4">
                        {q.format_config.correct_answers.map((ans: string, ansIndex: number) => (
                          <li key={ansIndex}>• {ans}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 数値問題の正解表示 */}
                  {q.question_format === 'numeric' && q.format_config?.correct_answer !== undefined && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-300 rounded">
                      <p className="text-sm font-bold text-blue-800">
                        ✅ 正解: {q.format_config.correct_answer}
                        {q.format_config.unit && ` ${q.format_config.unit}`}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-400 rounded">
          <h2 className="font-bold text-lg mb-2">📝 確認ポイント</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ question_formatが表示されている</li>
            <li>✅ format_configがnullではない</li>
            <li>✅ 自由記述問題の正解が表示されている</li>
            <li>✅ 数値問題の正解が表示されている</li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">
            全てのチェックが通れば、QuestionEditor-AllFormats.tsxも正常に動作するはずです。
          </p>
        </div>
      </div>
    </div>
  );
}