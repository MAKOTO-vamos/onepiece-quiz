// components/quiz/MultipleChoiceQuiz.tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { MultipleChoiceQuestion, Choice, QuestionImage } from '../../types/questions';

interface MultipleChoiceQuizProps {
  question: MultipleChoiceQuestion;
  onAnswer: (selectedChoiceIds: number[], isCorrect: boolean, score: number) => void;
  onNext?: () => void;
}

// Fisher-Yates シャッフルアルゴリズム（純粋関数版）
function shuffleArray<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let currentIndex = arr.length;
  let randomValue = seed;

  const random = () => {
    randomValue = (randomValue * 9301 + 49297) % 233280;
    return randomValue / 233280;
  };

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex]!, arr[currentIndex]!];
  }

  return arr;
}

export default function MultipleChoiceQuiz({ 
  question, 
  onAnswer,
  onNext 
}: MultipleChoiceQuizProps) {
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffleSeed] = useState(() => Math.random());

  // 選択肢をシャッフル（問題ごとに異なるランダム順序）
  const shuffledChoices = useMemo(() => {
    const shuffled = shuffleArray(question.choices, question.id + shuffleSeed);
    console.log('🔀 MultipleChoice シャッフル前:', question.choices.map(c => c.choice_text));
    console.log('🔀 MultipleChoice シャッフル後:', shuffled.map(c => c.choice_text));
    return shuffled;
  }, [question.id, question.choices, shuffleSeed]);

  // 選択肢のトグル
  const handleToggle = (choiceId: number) => {
    if (hasAnswered) {
      return;
    }

    if (selectedChoices.includes(choiceId)) {
      setSelectedChoices(prev => prev.filter(id => id !== choiceId));
    } else {
      // format_configの取得方法を修正
      const config = question.format_config;
      const maxSelections = typeof config === 'object' && config !== null 
        ? (config as { max_selections?: number }).max_selections
        : undefined;

      if (maxSelections && selectedChoices.length >= maxSelections) {
        alert(`最大${maxSelections}個まで選択できます`);
        return;
      }

      setSelectedChoices(prev => [...prev, choiceId]);
    }
  };

  // 回答を提出
  const handleSubmit = () => {
    // format_configの取得方法を修正
    const config = question.format_config;
    const minSelections = typeof config === 'object' && config !== null
      ? ((config as { min_selections?: number }).min_selections || 1)
      : 1;

    if (selectedChoices.length < minSelections) {
      alert(`最低${minSelections}個選択してください`);
      return;
    }

    // 採点
    const partialScoring = typeof config === 'object' && config !== null
      ? ((config as { partial_scoring?: boolean }).partial_scoring || false)
      : false;

    const result = checkMultipleChoiceAnswer(
      selectedChoices,
      question.choices,
      partialScoring,
      question.points
    );

    setIsCorrect(result.correct);
    setScore(result.score);
    setHasAnswered(true);

    onAnswer(selectedChoices, result.correct, result.score);
  };

  // 採点ロジック
  const checkMultipleChoiceAnswer = (
    selectedIds: number[],
    choices: Choice[],
    partialScoring: boolean,
    maxPoints: number
  ): { correct: boolean; score: number } => {
    const correctIds = choices.filter(c => c.is_correct).map(c => c.id);

    const isFullyCorrect = 
      selectedIds.length === correctIds.length &&
      selectedIds.every(id => correctIds.includes(id)) &&
      correctIds.every(id => selectedIds.includes(id));

    if (isFullyCorrect) {
      return { correct: true, score: maxPoints };
    }

    if (partialScoring) {
      const correctSelections = selectedIds.filter(id => 
        correctIds.includes(id)
      ).length;
      const incorrectSelections = selectedIds.filter(id => 
        !correctIds.includes(id)
      ).length;

      const accuracy = (correctSelections - incorrectSelections) / correctIds.length;
      
      if (accuracy > 0) {
        const partialScore = Math.floor(accuracy * maxPoints);
        return { correct: false, score: partialScore };
      }
    }

    return { correct: false, score: 0 };
  };

  // format_configから値を取得
  const config = question.format_config;
  const minSelections = typeof config === 'object' && config !== null
    ? ((config as { min_selections?: number }).min_selections)
    : undefined;
  const maxSelections = typeof config === 'object' && config !== null
    ? ((config as { max_selections?: number }).max_selections)
    : undefined;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 問題番号と形式 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
          複数選択
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
        <p className="text-sm text-gray-600">
          （複数回答可）
        </p>
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

      {/* 選択肢 */}
      <div className="space-y-3 mb-6">
        {shuffledChoices.map((choice: Choice) => {
          const isSelected = selectedChoices.includes(choice.id);
          const isThisCorrect = choice.is_correct;
          
          let bgColor = 'bg-white';
          let borderColor = 'border-gray-300';
          let textColor = 'text-gray-900';

          if (hasAnswered) {
            if (isThisCorrect) {
              bgColor = 'bg-green-50';
              borderColor = 'border-green-500';
              textColor = 'text-green-900';
            } else if (isSelected) {
              bgColor = 'bg-red-50';
              borderColor = 'border-red-500';
              textColor = 'text-red-900';
            }
          } else if (isSelected) {
            bgColor = 'bg-blue-50';
            borderColor = 'border-blue-500';
            textColor = 'text-blue-900';
          }

          return (
            <label
              key={choice.id}
              className={`
                block p-4 rounded-lg border-2 cursor-pointer
                transition-all duration-200
                ${bgColor} ${borderColor} ${textColor}
                ${!hasAnswered && 'hover:border-blue-400 hover:bg-blue-50'}
              `}
              onClick={() => {
                // handleToggle is called from checkbox onChange
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    handleToggle(choice.id);
                  }}
                  disabled={hasAnswered}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />

                <span className="flex-1 text-lg">
                  {choice.choice_text}
                </span>

                {hasAnswered && (
                  <span className="text-xl">
                    {isThisCorrect ? '✅' : (isSelected ? '❌' : '')}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* 選択数の表示 */}
      <div className="mb-4 text-center text-sm text-gray-600">
        選択中: {selectedChoices.length}個
        {minSelections && (
          <span className="ml-2">
            （最低{minSelections}個選択）
          </span>
        )}
        {maxSelections && (
          <span className="ml-2">
            （最大{maxSelections}個まで）
          </span>
        )}
      </div>

      {/* 回答ボタン or 結果表示 */}
      {!hasAnswered ? (
        <button
          onClick={handleSubmit}
          disabled={selectedChoices.length === 0}
          className="
            w-full py-4 px-6 
            bg-[#B22222] text-white 
            rounded-lg font-bold text-lg
            hover:bg-red-700 
            disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors
          "
        >
          回答する
        </button>
      ) : (
        <div className="space-y-4">
          <div className={`
            p-6 rounded-lg text-center
            ${isCorrect ? 'bg-green-100 border-4 border-green-500' : 'bg-red-100 border-4 border-red-500'}
          `}>
            <div className={`text-5xl font-extrabold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {isCorrect ? '⭕ 正解！' : '❌ 不正解'}
            </div>
            <div className={`text-3xl font-extrabold ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
              {score}pt
            </div>
            {!isCorrect && typeof config === 'object' && config !== null &&
              (config as { partial_scoring?: boolean }).partial_scoring && score > 0 && (
              <div className="text-sm mt-2 text-gray-900">
                部分点が加算されました
              </div>
            )}
          </div>

          {question.explanation && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-900 mb-2">💡 解説</h3>
              <p className="text-blue-800">{question.explanation}</p>
            </div>
          )}

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