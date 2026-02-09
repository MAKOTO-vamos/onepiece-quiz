// components/quiz/OrderingQuiz.tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { OrderingQuestion, Choice, QuestionImage } from '../../types/questions';

interface OrderingQuizProps {
  question: OrderingQuestion;
  onAnswer: (isCorrect: boolean, score: number) => void;
  onNext?: () => void;
}

// Fisher-Yates シャッフル
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

export default function OrderingQuiz({ 
  question, 
  onAnswer,
  onNext 
}: OrderingQuizProps) {
  const [shuffleSeed] = useState(() => Math.random());
  
  // 初期順序をシャッフル（問題ごとに異なるランダム順序）
  const initialOrder = useMemo(() => {
    const items = (question.choices || []).map(c => c.id);
    const shuffled = shuffleArray(items, question.id + shuffleSeed);
    console.log('🔀 Ordering シャッフル前:', items);
    console.log('🔀 Ordering シャッフル後:', shuffled);
    return shuffled;
  }, [question.id, question.choices, shuffleSeed]);

  const [currentOrder, setCurrentOrder] = useState<number[]>(initialOrder);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  console.log('🎮 OrderingQuiz レンダリング');
  console.log('📋 question.choices:', question.choices);
  console.log('🔢 initialOrder:', initialOrder);
  console.log('📊 currentOrder:', currentOrder);

  // アイテムを上に移動
  const moveUp = (index: number) => {
    console.log('⬆️ moveUp called:', index);
    if (index === 0 || hasAnswered) {
      console.log('⚠️ 移動できません（先頭または回答済み）');
      return;
    }
    const newOrder = [...currentOrder];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1]!, newOrder[index]!];
    console.log('✅ 新しい順序:', newOrder);
    setCurrentOrder(newOrder);
  };

  // アイテムを下に移動
  const moveDown = (index: number) => {
    console.log('⬇️ moveDown called:', index);
    if (index === currentOrder.length - 1 || hasAnswered) {
      console.log('⚠️ 移動できません（最後尾または回答済み）');
      return;
    }
    const newOrder = [...currentOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1]!, newOrder[index]!];
    console.log('✅ 新しい順序:', newOrder);
    setCurrentOrder(newOrder);
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (hasAnswered) return;
    console.log('🖱️ Drag start:', index);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || hasAnswered) return;

    console.log(`🔄 Drag over: from ${draggedIndex} to ${index}`);

    const newOrder = [...currentOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem!);
    
    setCurrentOrder(newOrder);
    setDraggedIndex(index);
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('✅ Drop completed');
    setDraggedIndex(null);
  };

  // 回答を提出
  const handleSubmit = () => {
    if (hasAnswered) return;

    console.log('🔍 採点開始');
    console.log('📊 currentOrder:', currentOrder);
    console.log('📊 choices:', question.choices);
    console.log('📊 choices with correct_position:', question.choices?.map(c => ({
      id: c.id,
      text: c.choice_text,
      correct_position: c.correct_position
    })));

    const result = checkOrderingAnswer(
      currentOrder,
      question.choices,
      question.format_config?.partial_scoring || false,
      question.points
    );

    console.log('✅ 採点結果:', result);

    setIsCorrect(result.correct);
    setScore(result.score);
    setHasAnswered(true);

    onAnswer(result.correct, result.score);
  };

  // 採点ロジック
  const checkOrderingAnswer = (
    userOrder: number[],
    choices: Choice[] | undefined,
    partialScoring: boolean,
    maxPoints: number
  ): { correct: boolean; score: number } => {
    if (!choices || choices.length === 0) {
      console.error('❌ choices が空です');
      return { correct: false, score: 0 };
    }

    // 正解の順序を取得
    const correctOrder = [...choices]
      .sort((a, b) => (a.correct_position || 0) - (b.correct_position || 0))
      .map(c => c.id);

    console.log('🎯 正解の順序 (correctOrder):', correctOrder);
    console.log('👤 ユーザーの順序 (userOrder):', userOrder);

    // 完全一致判定
    const isFullyCorrect = userOrder.every((id, index) => id === correctOrder[index]);

    console.log('🔍 完全一致?', isFullyCorrect);

    if (isFullyCorrect) {
      return { correct: true, score: maxPoints };
    }

    // 部分点システム（隣接ペアの正解率）
    if (partialScoring) {
      let correctPairs = 0;
      const totalPairs = userOrder.length - 1;

      for (let i = 0; i < totalPairs; i++) {
        const userPair = [userOrder[i], userOrder[i + 1]];
        const correctIndex1 = correctOrder.indexOf(userPair[0]!);
        const correctIndex2 = correctOrder.indexOf(userPair[1]!);

        // 隣接ペアが正解順序でも隣接していれば正解
        if (correctIndex2 === correctIndex1 + 1) {
          correctPairs++;
        }
      }

      const accuracy = correctPairs / totalPairs;
      if (accuracy > 0) {
        const partialScore = Math.floor(accuracy * maxPoints);
        return { correct: false, score: partialScore };
      }
    }

    return { correct: false, score: 0 };
  };

  // IDから選択肢を取得
  const getChoiceById = (id: number) => {
    return (question.choices || []).find(c => c.id === id);
  };

  // 正解の順序を取得
  const correctOrder = useMemo(() => {
    return [...(question.choices || [])]
      .sort((a, b) => (a.correct_position || 0) - (b.correct_position || 0))
      .map(c => c.id);
  }, [question.choices]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 問題番号と形式 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">
          🔀 並べ替え
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
        {question.format_config?.ordering_criteria && (
          <p className="text-sm text-gray-600">
            （{question.format_config.ordering_criteria}）
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

      {/* 並べ替えリスト */}
      <div className="mb-6 space-y-2">
        {currentOrder.map((choiceId, index) => {
          const choice = getChoiceById(choiceId);
          if (!choice) return null;

          const isCorrectPosition = hasAnswered && correctOrder[index] === choiceId;
          const isWrongPosition = hasAnswered && correctOrder[index] !== choiceId;

          return (
            <div
              key={choiceId}
              draggable={!hasAnswered}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${hasAnswered ? 'cursor-default' : 'cursor-move'}
                ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                ${isCorrectPosition ? 'bg-green-50 border-green-500' : ''}
                ${isWrongPosition ? 'bg-red-50 border-red-500' : ''}
                ${!hasAnswered ? 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {/* ドラッグハンドル */}
                {!hasAnswered && (
                  <div className="flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="text-gray-400">
                      <circle cx="4" cy="5" r="1.5" fill="currentColor"/>
                      <circle cx="4" cy="10" r="1.5" fill="currentColor"/>
                      <circle cx="4" cy="15" r="1.5" fill="currentColor"/>
                      <circle cx="10" cy="5" r="1.5" fill="currentColor"/>
                      <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                      <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                )}

                {/* 順序番号 */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                  ${isCorrectPosition ? 'bg-green-500 text-white' : ''}
                  ${isWrongPosition ? 'bg-red-500 text-white' : ''}
                  ${!hasAnswered ? 'bg-[#3498DB] text-white' : ''}
                `}>
                  {index + 1}
                </div>

                {/* 選択肢テキスト */}
                <span className={`
                  flex-1 text-lg font-medium
                  ${isCorrectPosition ? 'text-green-900' : ''}
                  ${isWrongPosition ? 'text-red-900' : ''}
                  ${!hasAnswered ? 'text-gray-900' : ''}
                `}>
                  {choice.choice_text}
                </span>

                {/* 移動ボタン（モバイル用） */}
                {!hasAnswered && (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveUp(index);
                      }}
                      disabled={index === 0}
                      className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="上に移動"
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDown(index);
                      }}
                      disabled={index === currentOrder.length - 1}
                      className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="下に移動"
                    >
                      ⬇️
                    </button>
                  </div>
                )}

                {/* 回答後の表示 */}
                {hasAnswered && (
                  <span className="text-2xl">
                    {isCorrectPosition ? '✅' : '❌'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ヒント */}
      {!hasAnswered && (
        <div className="mb-4 text-center text-sm text-gray-600 space-y-1">
          <p>💡 <strong>PCの場合:</strong> アイテムをドラッグ&ドロップで並べ替え</p>
          <p>📱 <strong>スマホの場合:</strong> ⬆️⬇️ボタンで並べ替え</p>
        </div>
      )}

      {/* 回答ボタン or 結果表示 */}
      {!hasAnswered ? (
        <button
          onClick={handleSubmit}
          className="
            w-full py-4 px-6 
            bg-[#B22222] text-white 
            rounded-lg font-bold text-lg
            hover:bg-red-700 
            transition-colors
          "
        >
          この順序で回答する
        </button>
      ) : (
        <div className="space-y-4">
          {/* 結果表示 */}
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
            {!isCorrect && question.format_config?.partial_scoring && score > 0 && (
              <div className="text-sm mt-2 text-gray-900 font-medium">
                部分点が加算されました
              </div>
            )}
          </div>

          {/* 正解の順序を表示 */}
          {!isCorrect && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-900 mb-2">📋 正解の順序</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                {correctOrder.map((choiceId) => {
                  const choice = getChoiceById(choiceId);
                  return choice ? (
                    <li key={choiceId}>{choice.choice_text}</li>
                  ) : null;
                })}
              </ol>
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