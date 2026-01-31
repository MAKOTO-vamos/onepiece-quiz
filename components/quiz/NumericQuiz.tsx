// components/quiz/NumericQuiz.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { NumericQuestion, QuestionImage } from '../../types/questions';

interface NumericQuizProps {
  question: NumericQuestion;
  onAnswer: (isCorrect: boolean, score: number) => void;
  onNext?: () => void;
}

export default function NumericQuiz({ 
  question, 
  onAnswer,
  onNext 
}: NumericQuizProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);

  console.log('🔢 NumericQuiz レンダリング');
  console.log('📋 question:', question);
  console.log('🎯 correct_answer:', question.format_config.correct_answer);
  console.log('📊 acceptable_range:', question.format_config.acceptable_range);

  // 回答を提出
  const handleSubmit = () => {
    if (hasAnswered || !userAnswer.trim()) return;

    const numericValue = parseFloat(userAnswer);
    
    if (isNaN(numericValue)) {
      alert('有効な数値を入力してください');
      return;
    }

    console.log('🔍 採点開始');
    console.log('👤 ユーザーの回答:', numericValue);

    const result = checkNumericAnswer(
      numericValue,
      question.format_config.correct_answer,
      question.format_config.acceptable_range,
      question.points
    );

    console.log('✅ 採点結果:', result);

    setIsCorrect(result.correct);
    setScore(result.score);
    setHasAnswered(true);

    onAnswer(result.correct, result.score);
  };

  // 採点ロジック
  const checkNumericAnswer = (
    userAnswer: number,
    correctAnswer: number,
    acceptableRange: { min?: number; max?: number } | undefined,
    maxPoints: number
  ): { correct: boolean; score: number } => {
    
    // 許容範囲が指定されている場合
    if (acceptableRange) {
      const min = acceptableRange.min ?? correctAnswer;
      const max = acceptableRange.max ?? correctAnswer;
      
      console.log('📏 許容範囲:', min, '～', max);
      
      if (userAnswer >= min && userAnswer <= max) {
        return { correct: true, score: maxPoints };
      }
    } else {
      // 完全一致
      if (userAnswer === correctAnswer) {
        return { correct: true, score: maxPoints };
      }
    }

    return { correct: false, score: 0 };
  };

  // 単位の表示
  const unit = question.format_config.unit || '';

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 問題番号と形式 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
          🔢 数値入力
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
        {unit && (
          <p className="text-sm text-gray-600 mt-2">
            💡 単位: {unit}
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

      {/* 数値入力 */}
      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 text-gray-700">
          あなたの回答
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={hasAnswered}
            placeholder="数値を入力してください"
            className={`
              flex-1 p-4 text-lg font-medium rounded-lg border-2 transition-all
              ${hasAnswered 
                ? 'bg-gray-100 cursor-not-allowed text-gray-700' 
                : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900'
              }
            `}
          />
          {unit && (
            <span className="text-lg font-bold text-gray-700 px-3">
              {unit}
            </span>
          )}
        </div>
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
          </div>

          {/* あなたの回答 */}
          <div className={`
            p-4 rounded-lg border-2
            ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}
          `}>
            <h3 className="font-bold text-gray-900 mb-2">あなたの回答:</h3>
            <p className={`text-lg ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {parseFloat(userAnswer).toLocaleString()}{unit ? ` ${unit}` : ''}
            </p>
          </div>

          {/* 正解を表示（不正解の場合） */}
          {!isCorrect && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-900 mb-2">📋 正解:</h3>
              <p className="text-blue-800 text-lg">
                {question.format_config.correct_answer.toLocaleString()}{unit ? ` ${unit}` : ''}
              </p>
              {question.format_config.acceptable_range && (
                <p className="text-sm text-blue-700 mt-2">
                  （許容範囲: {question.format_config.acceptable_range.min?.toLocaleString()} ～ {question.format_config.acceptable_range.max?.toLocaleString()}{unit ? ` ${unit}` : ''}）
                </p>
              )}
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