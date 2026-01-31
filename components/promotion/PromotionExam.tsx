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
  choices: Choice[];
}

interface PromotionExamProps {
  arcId: number; // 解放したいエリアのID
  prevArcId: number; // 前のエリアのID
}

export default function PromotionExam({ arcId, prevArcId }: PromotionExamProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
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
      console.log('🔍 DEBUG: Starting loadExamData');
      console.log('🔍 DEBUG: arcId =', arcId);
      console.log('🔍 DEBUG: prevArcId =', prevArcId);

      // 1. 解放したいエリアの設定を取得
      const { data: arc, error: arcError } = await supabase
        .from('story_arcs')
        .select('display_name, promotion_exam_question_count, promotion_exam_pass_rate')
        .eq('id', arcId)
        .single();

      console.log('🔍 DEBUG: arc data =', arc);
      console.log('🔍 DEBUG: arc error =', arcError);

      if (!arc) {
        console.error('❌ Arc not found for arcId:', arcId);
        setLoading(false);
        return;
      }

      setArcName(arc.display_name);
      const settings = {
        questionCount: arc.promotion_exam_question_count,
        passRate: arc.promotion_exam_pass_rate,
      };
      setExamSettings(settings);
      console.log('🔍 DEBUG: settings =', settings);

      // 2. 前のエリアの問題を取得
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          difficulty,
          points,
          explanation,
          choices (
            id,
            choice_text,
            is_correct,
            order_num
          )
        `)
        .eq('story_arc_id', prevArcId);

      console.log('🔍 DEBUG: prevArcId =', prevArcId);
      console.log('🔍 DEBUG: questionsData length =', questionsData?.length);
      console.log('🔍 DEBUG: questions error =', questionsError);
      console.log('🔍 DEBUG: First question =', questionsData?.[0]);

      if (questionsData && questionsData.length > 0) {
        // ランダムにシャッフルして必要数だけ取得
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, settings.questionCount);
        console.log('🔍 DEBUG: selectedQuestions length =', selectedQuestions.length);
        setQuestions(selectedQuestions as Question[]);
      } else {
        console.error('❌ No questions found for prevArcId:', prevArcId);
      }
    } catch (error) {
      console.error('❌ Error loading exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceClick = (choiceId: number) => {
    if (showResult) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (selectedChoice === null) return;

    const currentQuestion = questions[currentIndex];
    const selectedChoiceData = currentQuestion.choices.find(c => c.id === selectedChoice);
    const isCorrect = selectedChoiceData?.is_correct || false;

    setAnswers([...answers, isCorrect]);
    setShowResult(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedChoice(null);
      setShowResult(false);
    } else {
      // 試験終了 - 結果を判定
      await finishExam();
    }
  };

  const finishExam = async () => {
    const correctCount = answers.filter(a => a).length;
    const correctRate = (correctCount / questions.length) * 100;
    const passed = correctRate >= examSettings.passRate;

    setExamPassed(passed);
    setExamFinished(true);

    if (passed && userId) {
      // 合格した場合、次のエリアを解放
      await unlockNextArc();
    }
  };

  const unlockNextArc = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .update({
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('story_arc_id', arcId);

      if (error) {
        console.error('Error unlocking arc:', error);
      }
    } catch (error) {
      console.error('Error in unlockNextArc:', error);
    }
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
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

  // 試験終了画面
  if (examFinished) {
    const correctCount = answers.filter(a => a).length;
    const correctRate = (correctCount / questions.length) * 100;

    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className={`bg-white rounded-lg shadow-lg border-4 p-8 text-center ${
            examPassed ? 'border-[#27AE60]' : 'border-[#E74C3C]'
          }`}>
            {/* 結果表示 */}
            <div className="text-6xl mb-4">
              {examPassed ? '🎉' : '😢'}
            </div>
            <h2 className={`text-4xl font-bold mb-4 ${
              examPassed ? 'text-[#27AE60]' : 'text-[#E74C3C]'
            }`}>
              {examPassed ? '合格！' : '不合格...'}
            </h2>
            
            {/* スコア */}
            <div className="mb-6">
              <div className="text-6xl font-bold text-[#2C3E50] mb-2">
                {correctRate.toFixed(0)}%
              </div>
              <p className="text-[#7F8C8D] text-xl">
                {questions.length}問中 {correctCount}問正解
              </p>
              <p className="text-[#7F8C8D]">
                （合格ライン: {examSettings.passRate}%）
              </p>
            </div>

            {/* メッセージ */}
            {examPassed ? (
              <div className="mb-8">
                <p className="text-2xl font-bold text-[#2C3E50] mb-2">
                  ⚓ {arcName}が解放されました！
                </p>
                <p className="text-[#7F8C8D]">
                  新しい冒険が始まります！
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <p className="text-xl font-bold text-[#2C3E50] mb-2">
                  もう一度チャレンジしましょう
                </p>
                <p className="text-[#7F8C8D]">
                  前のエリアで復習してから再挑戦できます
                </p>
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-4 justify-center">
              {!examPassed && (
                <button
                  onClick={handleRetry}
                  className="bg-[#F39C12] hover:bg-[#E67E22] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  🔄 再挑戦
                </button>
              )}
              <button
                onClick={handleReturnHome}
                className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                🗺️ 航海マップへ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 試験中の画面
  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedChoice !== null && 
    currentQuestion.choices.find(c => c.id === selectedChoice)?.is_correct;

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="bg-[#F39C12] text-white rounded-lg p-4 mb-4">
            <h1 className="text-3xl font-bold text-center">
              🎓 {arcName}昇格試験
            </h1>
          </div>
          <div className="flex justify-between text-[#7F8C8D]">
            <span>問題 {currentIndex + 1} / {questions.length}</span>
            <span>
              正解数: {answers.filter(a => a).length} / {answers.length}
            </span>
          </div>
          {/* 進捗バー */}
          <div className="mt-2 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-[#F39C12] h-full transition-all duration-300"
              style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          {/* 難易度バッジ */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
              'bg-red-200 text-red-800'
            }`}>
              {currentQuestion.difficulty}
            </span>
          </div>

          {/* 問題文 */}
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6">
            {currentQuestion.question_text}
          </h2>

          {/* 選択肢 */}
          <div className="space-y-3 mb-6">
            {currentQuestion.choices
              .sort((a, b) => a.order_num - b.order_num)
              .map((choice) => {
                const isSelected = selectedChoice === choice.id;
                const showCorrect = showResult && choice.is_correct;
                const showWrong = showResult && isSelected && !choice.is_correct;

                return (
                  <button
                    key={choice.id}
                    onClick={() => handleChoiceClick(choice.id)}
                    disabled={showResult}
                    className={`w-full p-4 rounded-lg border-2 text-left font-medium transition-all ${
                      showCorrect ? 'bg-green-100 border-green-500' :
                      showWrong ? 'bg-red-100 border-red-500' :
                      isSelected ? 'bg-[#3498DB] border-[#2980B9] text-white' :
                      'bg-white border-[#95A5A6] hover:border-[#3498DB]'
                    } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={showResult && !showCorrect && !showWrong ? 'text-[#2C3E50]' : ''}>
                      {showCorrect && '✅ '}
                      {showWrong && '❌ '}
                      {choice.choice_text}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* 結果表示 */}
          {showResult && (
            <div className={`p-4 rounded-lg mb-4 ${
              isCorrect ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'
            }`}>
              <div className="text-2xl font-bold mb-2">
                {isCorrect ? '🎉 正解！' : '😅 不正解...'}
              </div>
              {currentQuestion.explanation && (
                <p className="text-[#2C3E50]">
                  💡 {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end">
            {!showResult ? (
              <button
                onClick={handleSubmit}
                disabled={selectedChoice === null}
                className="bg-[#E74C3C] hover:bg-[#C0392B] text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                回答する
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-[#27AE60] hover:bg-[#229954] text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                {currentIndex < questions.length - 1 ? '次の問題へ' : '結果を見る'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}