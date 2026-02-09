'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Choice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  order_num: number;
}

interface Question {
  id: number;
  question_text: string;
  difficulty: string;
  points: number;
  explanation: string | null;
  question_format: string;
  format_config: Record<string, unknown> | null;
  choices: Choice[];
}

interface PromotionExamProps {
  arcId: number;
  prevArcId: number;
}

export default function PromotionExam({ arcId, prevArcId }: PromotionExamProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [numericAnswer, setNumericAnswer] = useState('');
  const [orderedItems, setOrderedItems] = useState<Choice[]>([]);
  const [shuffledChoices, setShuffledChoices] = useState<Choice[]>([]); // シャッフル済み選択肢
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [arcName, setArcName] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [examSettings, setExamSettings] = useState({
    questionCount: 10,
    passRate: 70,
  });
  const [examFinished, setExamFinished] = useState(false);
  const [examPassed, setExamPassed] = useState(false);

  // 選択肢をシャッフルする関数
  const shuffleChoices = (choices: Choice[]) => {
    return [...choices].sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    loadUser();
    loadExamData();
  }, [arcId, prevArcId]);

  const loadUser = () => {
    const userStr = localStorage.getItem('supabase_user');
    if (userStr && userStr !== 'undefined') {
      const user = JSON.parse(userStr);
      setUserId(user.id);
    }
  };

  const loadExamData = async () => {
    try {
      const { data: arc } = await supabase
        .from('story_arcs')
        .select('display_name, promotion_exam_question_count, promotion_exam_pass_rate')
        .eq('id', arcId)
        .single();

      if (!arc) {
        setLoading(false);
        return;
      }

      setArcName(arc.display_name);
      setExamSettings({
        questionCount: arc.promotion_exam_question_count,
        passRate: arc.promotion_exam_pass_rate,
      });

      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
          points,
          explanation,
          question_format,
          format_config,
          choices (
            id,
            choice_text,
            is_correct,
            order_num
          )
        `)
        .eq('story_arc_id', prevArcId);

      if (questionsData && questionsData.length > 0) {
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, arc.promotion_exam_question_count);
        setQuestions(selected as Question[]);
        
        // 最初の問題の選択肢をシャッフル
        const firstQuestion = selected[0] as Question;
        if (firstQuestion.question_format === 'ordering') {
          // 並べ替え問題はシャッフルして初期化
          setOrderedItems(shuffleChoices(firstQuestion.choices));
        } else if (firstQuestion.question_format === 'single_choice' || 
                   firstQuestion.question_format === 'multiple_choice' ||
                   !firstQuestion.question_format) {
          // 単一選択・複数選択はシャッフル済み選択肢を保存
          setShuffledChoices(shuffleChoices(firstQuestion.choices));
        }
      }
    } catch (error) {
      console.error('Error loading exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceClick = (choiceId: number) => {
    if (showResult) return;
    setSelectedChoice(choiceId);
  };

  const handleMultipleChoiceClick = (choiceId: number) => {
    if (showResult) return;
    if (selectedChoices.includes(choiceId)) {
      setSelectedChoices(selectedChoices.filter(id => id !== choiceId));
    } else {
      setSelectedChoices([...selectedChoices, choiceId]);
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...orderedItems];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    setOrderedItems(newItems);
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentIndex];
    let isCorrect = false;

    console.log('🔍 Question format:', currentQuestion.question_format);
    console.log('🔍 Format config:', currentQuestion.format_config);

    if (currentQuestion.question_format === 'multiple_choice') {
      const correctChoices = currentQuestion.choices
        .filter(c => c.is_correct)
        .map(c => c.id)
        .sort();
      const selected = [...selectedChoices].sort();
      isCorrect = JSON.stringify(selected) === JSON.stringify(correctChoices);
      console.log('🔍 Multiple choice - Correct:', correctChoices, 'Selected:', selected, 'Result:', isCorrect);
      
    } else if (currentQuestion.question_format === 'free_text') {
      const userAnswer = textAnswer.trim();
      
      // correct_answers配列から正解を取得
      const correctAnswers = currentQuestion.format_config?.correct_answers as string[] | undefined;
      const caseSensitive = currentQuestion.format_config?.case_sensitive as boolean | undefined;
      
      console.log('🔍 Free text - Correct answers:', correctAnswers);
      console.log('🔍 Free text - User:', userAnswer);
      console.log('🔍 Free text - Case sensitive:', caseSensitive);
      
      if (correctAnswers && Array.isArray(correctAnswers) && correctAnswers.length > 0) {
        if (caseSensitive) {
          // 大文字小文字を区別する
          isCorrect = correctAnswers.some(answer => userAnswer === answer);
        } else {
          // 大文字小文字を区別しない
          isCorrect = correctAnswers.some(answer => 
            userAnswer.toLowerCase() === answer.toLowerCase()
          );
        }
      }
      
      console.log('🔍 Free text - Result:', isCorrect);
      
    } else if (currentQuestion.question_format === 'numeric') {
      const correctAnswer = currentQuestion.format_config?.correct_answer;
      const userNumber = Number(numericAnswer);
      
      console.log('🔍 Numeric - Correct answer:', correctAnswer, 'Type:', typeof correctAnswer);
      console.log('🔍 Numeric - User:', userNumber, 'Type:', typeof userNumber);
      
      // 数値として比較
      if (typeof correctAnswer === 'number') {
        isCorrect = userNumber === correctAnswer;
      } else if (typeof correctAnswer === 'string') {
        isCorrect = userNumber === Number(correctAnswer);
      }
      
      console.log('🔍 Numeric - Result:', isCorrect);
      
    } else if (currentQuestion.question_format === 'ordering') {
      const correctOrder = currentQuestion.choices
        .sort((a, b) => a.order_num - b.order_num)
        .map(c => c.id);
      const currentOrder = orderedItems.map(c => c.id);
      isCorrect = JSON.stringify(correctOrder) === JSON.stringify(currentOrder);
      console.log('🔍 Ordering - Correct:', correctOrder, 'Current:', currentOrder, 'Result:', isCorrect);
      
    } else {
      if (selectedChoice === null) return;
      const selectedChoiceData = currentQuestion.choices.find(c => c.id === selectedChoice);
      isCorrect = selectedChoiceData?.is_correct || false;
      console.log('🔍 Single choice - Selected:', selectedChoice, 'Result:', isCorrect);
    }

    // 回答履歴を保存
    if (userId) {
      try {
        await supabase
          .from('answer_history')
          .insert({
            user_id: userId,
            question_id: currentQuestion.id,
            is_correct: isCorrect,
          });
        console.log('✅ Answer saved to history:', { question_id: currentQuestion.id, is_correct: isCorrect });
      } catch (error) {
        console.error('❌ Error saving answer history:', error);
      }
    }

    setAnswers([...answers, isCorrect]);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedChoice(null);
      setSelectedChoices([]);
      setTextAnswer('');
      setNumericAnswer('');
      setShowResult(false);
      
      // 次の問題の選択肢をシャッフル
      const nextQuestion = questions[nextIndex];
      if (nextQuestion.question_format === 'ordering') {
        setOrderedItems(shuffleChoices(nextQuestion.choices));
      } else if (nextQuestion.question_format === 'single_choice' || 
                 nextQuestion.question_format === 'multiple_choice' ||
                 !nextQuestion.question_format) {
        setShuffledChoices(shuffleChoices(nextQuestion.choices));
      }
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    const correctCount = answers.filter(a => a).length;
    const correctRate = (correctCount / questions.length) * 100;
    const passed = correctRate >= examSettings.passRate;

    setExamPassed(passed);
    setExamFinished(true);

    if (userId) {
      if (passed) {
        await unlockNextArc(correctCount, questions.length);
      } else {
        await updateBestScore(correctCount, questions.length);
      }
    }
  };

  const unlockNextArc = async (correctCount: number, totalQuestions: number) => {
    if (!userId) return;

    try {
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('promotion_exam_best_score')
        .eq('user_id', userId)
        .eq('story_arc_id', arcId)
        .single();

      const currentBestScore = currentProgress?.promotion_exam_best_score || 0;
      const finalBestScore = Math.max(correctCount, currentBestScore);
      const completionRate = totalQuestions > 0 ? (finalBestScore / totalQuestions) * 100 : 0;

      await supabase
        .from('user_progress')
        .update({
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
          promotion_exam_best_score: finalBestScore,
          promotion_exam_total_questions: totalQuestions,
          completion_rate: completionRate,
        })
        .eq('user_id', userId)
        .eq('story_arc_id', arcId);
    } catch (error) {
      console.error('Error unlocking arc:', error);
    }
  };

  const updateBestScore = async (correctCount: number, totalQuestions: number) => {
    if (!userId) return;

    try {
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('promotion_exam_best_score')
        .eq('user_id', userId)
        .eq('story_arc_id', prevArcId)
        .single();

      const currentBestScore = currentProgress?.promotion_exam_best_score || 0;

      if (correctCount > currentBestScore) {
        const completionRate = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        await supabase
          .from('user_progress')
          .update({
            promotion_exam_best_score: correctCount,
            promotion_exam_total_questions: totalQuestions,
            completion_rate: completionRate,
          })
          .eq('user_id', userId)
          .eq('story_arc_id', prevArcId);
      }
    } catch (error) {
      console.error('Error updating best score:', error);
    }
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setSelectedChoices([]);
    setTextAnswer('');
    setNumericAnswer('');
    setShuffledChoices([]);
    setOrderedItems([]);
    setShowResult(false);
    setAnswers([]);
    setExamFinished(false);
    setExamPassed(false);
    setLoading(true);
    loadExamData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">🎓 昇格試験を準備中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#2C3E50] mb-4">
            😅 問題が不足しています
          </div>
          <button
            onClick={handleReturnHome}
            className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-2 px-6 rounded-lg"
          >
            航海マップに戻る
          </button>
        </div>
      </div>
    );
  }

  if (examFinished) {
    const correctCount = answers.filter(a => a).length;
    const correctRate = (correctCount / questions.length) * 100;

    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className={`bg-white rounded-lg shadow-lg border-4 p-8 text-center ${
            examPassed ? 'border-[#27AE60]' : 'border-[#E74C3C]'
          }`}>
            <div className="text-6xl mb-4">
              {examPassed ? '🎉' : '😢'}
            </div>
            <h2 className={`text-4xl font-bold mb-4 ${
              examPassed ? 'text-[#27AE60]' : 'text-[#E74C3C]'
            }`}>
              {examPassed ? '合格！' : '不合格...'}
            </h2>
            
            <div className="mb-6">
              <div className="text-6xl font-bold text-[#2C3E50] mb-2">
                {correctCount} / {questions.length}
              </div>
              <div className="text-2xl text-gray-600">
                正答率: {correctRate.toFixed(1)}%
              </div>
            </div>

            {examPassed && (
              <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-bold text-lg">
                  ✨ {arcName}が解放されました！
                </p>
              </div>
            )}

            {!examPassed && (
              <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 font-bold">
                  合格には {Math.ceil((questions.length * examSettings.passRate) / 100)}問以上の正解が必要です
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReturnHome}
                className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-3 px-8 rounded-lg"
              >
                航海マップに戻る
              </button>
              <button
                onClick={handleRetry}
                className="bg-[#F39C12] hover:bg-[#E67E22] text-white font-bold py-3 px-8 rounded-lg"
              >
                もう一度挑戦
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentCorrectRate = currentIndex + (showResult ? 1 : 0) > 0 
    ? Math.round((answers.filter(a => a).length / (currentIndex + (showResult ? 1 : 0))) * 100) 
    : 0;

  // 回答できる状態かチェック
  let canSubmit = false;
  if (currentQuestion.question_format === 'multiple_choice') {
    canSubmit = selectedChoices.length > 0;
  } else if (currentQuestion.question_format === 'free_text') {
    canSubmit = textAnswer.trim() !== '';
  } else if (currentQuestion.question_format === 'numeric') {
    canSubmit = numericAnswer.trim() !== '';
  } else if (currentQuestion.question_format === 'ordering') {
    canSubmit = true; // 並べ替えは常に回答可能
  } else {
    canSubmit = selectedChoice !== null;
  }

  // 正誤判定（表示用）
  let isCorrect = false;
  if (showResult) {
    if (currentQuestion.question_format === 'multiple_choice') {
      const correctChoices = currentQuestion.choices
        .filter(c => c.is_correct)
        .map(c => c.id)
        .sort();
      const selected = [...selectedChoices].sort();
      isCorrect = JSON.stringify(selected) === JSON.stringify(correctChoices);
    } else if (currentQuestion.question_format === 'ordering') {
      const correctOrder = currentQuestion.choices
        .sort((a, b) => a.order_num - b.order_num)
        .map(c => c.id);
      const currentOrder = orderedItems.map(c => c.id);
      isCorrect = JSON.stringify(correctOrder) === JSON.stringify(currentOrder);
    } else if (currentQuestion.question_format === 'free_text') {
      const userAnswer = textAnswer.trim();
      const correctAnswers = currentQuestion.format_config?.correct_answers as string[] | undefined;
      const caseSensitive = currentQuestion.format_config?.case_sensitive as boolean | undefined;
      
      if (correctAnswers && Array.isArray(correctAnswers) && correctAnswers.length > 0) {
        if (caseSensitive) {
          isCorrect = correctAnswers.some(answer => userAnswer === answer);
        } else {
          isCorrect = correctAnswers.some(answer => 
            userAnswer.toLowerCase() === answer.toLowerCase()
          );
        }
      }
    } else if (currentQuestion.question_format === 'numeric') {
      const correctAnswer = currentQuestion.format_config?.correct_answer;
      const userNumber = Number(numericAnswer);
      
      if (typeof correctAnswer === 'number') {
        isCorrect = userNumber === correctAnswer;
      } else if (typeof correctAnswer === 'string') {
        isCorrect = userNumber === Number(correctAnswer);
      }
    } else {
      isCorrect = selectedChoice !== null && 
        currentQuestion.choices.find(c => c.id === selectedChoice)?.is_correct || false;
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleReturnHome}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              ← 戻る
            </button>
            <div className="flex items-center gap-4">
              <span className="bg-[#F39C12] text-white px-4 py-2 rounded-lg font-bold text-lg">
                {currentIndex + 1} / {questions.length}
              </span>
              <span className="text-gray-600 font-bold">
                スコア: {answers.filter(a => a).length} / {answers.length}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-[#F39C12] mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#2C3E50]">🎓 合格条件</span>
              <span className="font-bold text-[#F39C12]">
                {examSettings.questionCount}問中 {Math.ceil((examSettings.questionCount * examSettings.passRate) / 100)}問正解 ({examSettings.passRate}%以上)
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  currentCorrectRate >= examSettings.passRate ? 'bg-[#27AE60]' : 'bg-[#F39C12]'
                }`}
                style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>現在の正答率: {currentCorrectRate}%</span>
              <span>必要正答率: {examSettings.passRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6">
            {currentQuestion.question_text}
          </h2>

          {/* 複数選択問題 */}
          {currentQuestion.question_format === 'multiple_choice' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3 font-bold">※ 正しいものをすべて選んでください</p>
              {shuffledChoices.map((choice) => {
                const isSelected = selectedChoices.includes(choice.id);
                const showCorrect = showResult && choice.is_correct;
                const showWrong = showResult && isSelected && !choice.is_correct;

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleMultipleChoiceClick(choice.id)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-lg font-bold text-left transition-all text-lg ${
                        showCorrect
                          ? 'bg-green-500 text-white border-4 border-green-700'
                          : showWrong
                          ? 'bg-red-500 text-white border-4 border-red-700'
                          : isSelected
                          ? 'bg-[#3498DB] text-white border-4 border-[#2980B9]'
                          : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-900'
                      } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          showResult 
                            ? (showCorrect || showWrong ? 'bg-white border-white' : 'bg-transparent border-white')
                            : isSelected 
                            ? 'bg-white border-white' 
                            : 'border-gray-400 bg-white'
                        }`}>
                          {/* 回答前: 選択済みならチェック */}
                          {!showResult && isSelected && <span className="text-[#3498DB] text-xl">✓</span>}
                          {/* 回答後: 選択済みならチェック（色は背景色に合わせる） */}
                          {showResult && isSelected && (
                            <span className={`text-xl ${
                              showCorrect ? 'text-green-500' : showWrong ? 'text-red-500' : 'text-gray-400'
                            }`}>✓</span>
                          )}
                        </div>
                        <span>
                          {showCorrect && '✅ '}
                          {showWrong && '❌ '}
                          {choice.choice_text}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {/* 記述問題 */}
          {currentQuestion.question_format === 'free_text' && (
            <div>
              <input
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={showResult}
                placeholder="回答を入力してください"
                className="w-full p-4 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-[#3498DB] focus:outline-none disabled:bg-gray-100 font-bold placeholder:text-gray-400"
              />
              {showResult && (
                <div className="mt-3 text-lg">
                  <p className="font-bold text-[#2C3E50]">
                    正解: {(currentQuestion.format_config?.correct_answers as string[] || []).join(' / ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 数値問題 */}
          {currentQuestion.question_format === 'numeric' && (
            <div>
              <input
                type="number"
                value={numericAnswer}
                onChange={(e) => setNumericAnswer(e.target.value)}
                disabled={showResult}
                placeholder="数値を入力してください"
                className="w-full p-4 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-[#3498DB] focus:outline-none disabled:bg-gray-100 font-bold placeholder:text-gray-400"
              />
              {showResult && (
                <div className="mt-3 text-lg">
                  <p className="font-bold text-[#2C3E50]">
                    正解: {currentQuestion.format_config?.correct_answer as number}
                    {currentQuestion.format_config?.unit ? ` ${currentQuestion.format_config.unit as string}` : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 並べ替え問題 */}
          {currentQuestion.question_format === 'ordering' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3 font-bold">※ 正しい順番に並べ替えてください</p>
              {orderedItems.map((choice, index) => {
                const correctOrderNum = currentQuestion.choices.find(c => c.id === choice.id)?.order_num;
                const correctPosition = correctOrderNum === index + 1;
                
                // デバッグログ（回答後のみ）
                if (showResult) {
                  console.log(`🔍 Ordering - Choice: ${choice.choice_text}, Current pos: ${index + 1}, Correct pos: ${correctOrderNum}, Is correct: ${correctPosition}`);
                }
                
                return (
                  <div
                    key={choice.id}
                    draggable={!showResult}
                    onDragStart={(e) => {
                      if (!showResult) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', index.toString());
                      }
                    }}
                    onDragOver={(e) => {
                      if (!showResult) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={(e) => {
                      if (!showResult) {
                        e.preventDefault();
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== index) {
                          moveItem(fromIndex, index);
                        }
                      }
                    }}
                    className={`p-4 rounded-lg font-bold border-4 ${
                      showResult && correctPosition
                        ? 'bg-green-500 text-white border-green-700'
                        : showResult && !correctPosition
                        ? 'bg-red-500 text-white border-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-900'
                    } ${!showResult ? 'cursor-move hover:bg-gray-200' : 'cursor-default'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          showResult && correctPosition
                            ? 'bg-white text-green-500'
                            : showResult && !correctPosition
                            ? 'bg-white text-red-500'
                            : 'bg-[#3498DB] text-white'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-lg">{choice.choice_text}</span>
                      </div>
                      {!showResult && (
                        <div className="flex gap-2">
                          {index > 0 && (
                            <button
                              onClick={() => moveItem(index, index - 1)}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold px-3 py-1 rounded"
                            >
                              ↑
                            </button>
                          )}
                          {index < orderedItems.length - 1 && (
                            <button
                              onClick={() => moveItem(index, index + 1)}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold px-3 py-1 rounded"
                            >
                              ↓
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 単一選択問題 */}
          {currentQuestion.question_format !== 'multiple_choice' && 
           currentQuestion.question_format !== 'free_text' && 
           currentQuestion.question_format !== 'numeric' &&
           currentQuestion.question_format !== 'ordering' && (
            <div className="space-y-3">
              {shuffledChoices.map((choice) => {
                const isSelected = selectedChoice === choice.id;
                const showCorrect = showResult && choice.is_correct;
                const showWrong = showResult && isSelected && !choice.is_correct;

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceClick(choice.id)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-lg font-bold text-left transition-all text-lg ${
                        showCorrect
                          ? 'bg-green-500 text-white border-4 border-green-700'
                          : showWrong
                          ? 'bg-red-500 text-white border-4 border-red-700'
                          : isSelected
                          ? 'bg-[#3498DB] text-white border-4 border-[#2980B9]'
                          : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-900'
                      } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {showCorrect && '✅ '}
                      {showWrong && '❌ '}
                      {choice.choice_text}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-[#27AE60] hover:bg-[#229954] disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors disabled:cursor-not-allowed"
          >
            回答する
          </button>
        ) : (
          <div>
            <div className={`p-6 rounded-lg mb-4 ${
              isCorrect
                ? 'bg-green-100 border-4 border-green-500'
                : 'bg-red-100 border-4 border-red-500'
            }`}>
              <p className={`text-3xl font-bold mb-2 ${
                isCorrect ? 'text-green-700' : 'text-red-700'
              }`}>
                {isCorrect ? '🎉 正解！' : '😢 不正解...'}
              </p>
              {currentQuestion.explanation && (
                <p className="text-gray-700 font-medium">
                  💡 {currentQuestion.explanation}
                </p>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors"
            >
              {currentIndex < questions.length - 1 ? '次の問題へ →' : '結果を見る'}
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-gray-600 font-bold">
          現在のスコア: {answers.filter(a => a).length} / {currentIndex + (showResult ? 1 : 0)} 問正解
        </div>
      </div>
    </div>
  );
}