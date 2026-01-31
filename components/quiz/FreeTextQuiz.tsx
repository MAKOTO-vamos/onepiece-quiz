// components/quiz/FreeTextQuiz.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { FreeTextQuestion, QuestionImage, MatchingMode } from '../../types/questions';

interface FreeTextQuizProps {
  question: FreeTextQuestion;
  onAnswer: (isCorrect: boolean, score: number) => void;
  onNext?: () => void;
}

export default function FreeTextQuiz({ 
  question, 
  onAnswer,
  onNext 
}: FreeTextQuizProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [matchedAnswer, setMatchedAnswer] = useState<string | null>(null);

  console.log('📝 FreeTextQuiz レンダリング');
  console.log('📋 question:', question);
  console.log('🎯 correct_answers:', question.format_config.correct_answers);

  // 回答を提出
  const handleSubmit = () => {
    if (hasAnswered || !userAnswer.trim()) return;

    console.log('🔍 採点開始');
    console.log('👤 ユーザーの回答:', userAnswer);

    const result = checkFreeTextAnswer(
      userAnswer,
      question.format_config.correct_answers || [],
      question.format_config.matching_mode || 'exact',
      question.format_config.case_sensitive || false,
      question.format_config.trim_whitespace !== false,
      question.points
    );

    console.log('✅ 採点結果:', result);

    setIsCorrect(result.correct);
    setScore(result.score);
    setMatchedAnswer(result.matchedAnswer);
    setHasAnswered(true);

    onAnswer(result.correct, result.score);
  };

  // 採点ロジック
  const checkFreeTextAnswer = (
    userAnswer: string,
    acceptableAnswers: string[],
    matchingMode: MatchingMode,
    caseSensitive: boolean,
    trimWhitespace: boolean,
    maxPoints: number
  ): { correct: boolean; score: number; matchedAnswer: string | null } => {
    
    let processedUserAnswer = userAnswer;
    if (trimWhitespace) {
      processedUserAnswer = processedUserAnswer.trim();
    }
    if (!caseSensitive) {
      processedUserAnswer = processedUserAnswer.toLowerCase();
    }

    console.log('🔄 処理後の回答:', processedUserAnswer);

    for (const acceptableAnswer of acceptableAnswers) {
      let processedAcceptable = acceptableAnswer;
      if (trimWhitespace) {
        processedAcceptable = processedAcceptable.trim();
      }
      if (!caseSensitive) {
        processedAcceptable = processedAcceptable.toLowerCase();
      }

      console.log('🎯 比較中:', processedUserAnswer, 'vs', processedAcceptable);

      switch (matchingMode) {
        case 'exact':
          // 完全一致
          if (processedUserAnswer === processedAcceptable) {
            return { correct: true, score: maxPoints, matchedAnswer: acceptableAnswer };
          }
          break;

        case 'partial':
          // 部分一致（正解が回答に含まれる）
          if (processedUserAnswer.includes(processedAcceptable)) {
            return { correct: true, score: maxPoints, matchedAnswer: acceptableAnswer };
          }
          break;

        case 'keywords':
          // キーワードマッチング（すべてのキーワードが含まれる）
          const keywords = processedAcceptable.split(/\s+/);
          const allKeywordsMatch = keywords.every(keyword => 
            processedUserAnswer.includes(keyword)
          );
          if (allKeywordsMatch) {
            return { correct: true, score: maxPoints, matchedAnswer: acceptableAnswer };
          }
          break;

        case 'regex':
          // 正規表現マッチング
          try {
            const regex = new RegExp(processedAcceptable, caseSensitive ? '' : 'i');
            if (regex.test(processedUserAnswer)) {
              return { correct: true, score: maxPoints, matchedAnswer: acceptableAnswer };
            }
          } catch (e) {
            console.error('正規表現エラー:', e);
          }
          break;
      }
    }

    return { correct: false, score: 0, matchedAnswer: null };
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 問題番号と形式 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
          ✍️ 自由記述
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
          難易度: {question.difficulty}
        </span>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
          {question.points}pt
        </span>
      </div>

      {/* 問題文 */}
      <div className="mb-6 p-6 bg-[#F4E4C1] rounded-lg border-4 border-[#1a1a1a]">
        <p className="text-xl font-bold text-[#2C3E50] mb-2">
          {question.question_text}
        </p>
        {question.format_config.placeholder && (
          <p className="text-sm text-gray-600 mt-2">
            💡 ヒント: {question.format_config.placeholder}
          </p>
        )}
      </div>

      {/* 画像表示（もしあれば） */}
      {question.images && question.images.length > 0 && (
        <div className="mb-6 space-y-4">
          {question.images.map((img: QuestionImage) => (
            <div key={img.id} className="relative w-full">
              <Image
                src={img.image_path}
                alt="問題画像"
                width={800}
                height={600}
                className="rounded-lg shadow-lg w-full h-auto"
              />
            </div>
          ))}
        </div>
      )}

      {/* 回答入力 */}
      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 text-gray-700">
          あなたの回答
        </label>
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          disabled={hasAnswered}
          placeholder={question.format_config.placeholder || '回答を入力してください'}
          className={`
            w-full p-4 text-lg font-medium rounded-lg border-2 transition-all
            ${hasAnswered 
              ? 'bg-gray-100 cursor-not-allowed text-gray-700' 
              : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900'
            }
          `}
        />
      </div>

      {/* 回答ボタン or 結果表示 */}
      {!hasAnswered ? (
        <button
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className="
            w-full py-4 px-6 
            bg-[#B22222] text-white 
            rounded-lg font-bold text-lg
            hover:bg-red-700 
            disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors
          "
        >
          回答する
        </button>
      ) : (
        <div className="space-y-4">
          {/* 結果表示 */}
          <div className={`
            p-6 rounded-lg text-center
            ${isCorrect ? 'bg-green-100 border-4 border-green-500' : 'bg-red-100 border-4 border-red-500'}
          `}>
            <div className={`text-4xl font-bold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {isCorrect ? '⭕ 正解！' : '❌ 不正解'}
            </div>
            <div className={`text-2xl font-bold ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {score}pt
            </div>
            {isCorrect && matchedAnswer && (
              <div className="text-sm mt-2 text-gray-900 font-medium">
                正解パターン: {matchedAnswer}
              </div>
            )}
          </div>

          {/* あなたの回答 */}
          <div className={`
            p-4 rounded-lg border-2
            ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}
          `}>
            <h3 className="font-bold text-gray-900 mb-2">あなたの回答:</h3>
            <p className={`text-lg ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {userAnswer}
            </p>
          </div>

          {/* 正解例を表示（不正解の場合） */}
          {!isCorrect && question.format_config.correct_answers && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-900 mb-2">📋 正解例:</h3>
              <ul className="space-y-1 text-blue-800">
                {question.format_config.correct_answers.map((answer: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>{answer}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 解説 */}
          {question.explanation && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-900 mb-2">💡 解説</h3>
              <p className="text-blue-800">{question.explanation}</p>
            </div>
          )}

          {/* 次の問題ボタン */}
          {onNext && (
            <button
              onClick={onNext}
              className="
                w-full py-4 px-6 
                bg-[#2C3E50] text-white 
                rounded-lg font-bold text-lg
                hover:bg-blue-800 
                transition-colors
              "
            >
              次の問題へ →
            </button>
          )}
        </div>
      )}
    </div>
  );
}