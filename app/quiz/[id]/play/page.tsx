// app/quiz/[id]/play/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { shuffleChoices } from '@/lib/shuffleChoices';
import MultipleChoiceQuiz from '@/components/quiz/MultipleChoiceQuiz';
import OrderingQuiz from '@/components/quiz/OrderingQuiz';
import type { MultipleChoiceQuestion, OrderingQuestion } from '../../../../types/questions';
import FreeTextQuiz from '@/components/quiz/FreeTextQuiz';
import type { FreeTextQuestion } from '../../../../types/questions';
import NumericQuiz from '@/components/quiz/NumericQuiz';
import type { NumericQuestion } from '../../../../types/questions';
import { useSearchParams } from 'next/navigation';
import QuizResult from '@/components/quiz/QuizResult';

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
  format_config: Record<string, unknown>;
  choices: Choice[];
}

export default function QuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'practice';
  const format = searchParams.get('format') || 'all';
  const count = parseInt(searchParams.get('count') || '0');
  const filter = searchParams.get('filter'); // 'unanswered' or 'wrong'
  const router = useRouter();
  const arcId = parseInt(params.id as string);

  const [question, setQuestion] = useState<Question | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<Choice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 進捗管理用
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  //全問完了後画面用
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [arcName, setArcName] = useState('');
  const [arcEmoji, setArcEmoji] = useState('');

  // ユーザーIDを取得
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // 初回ロード時に全問題を取得
  useEffect(() => {
  const fetchAllQuestions = async () => {
    setLoading(true);

    //全問完了後画面用
    const STORY_ARCS = [
    { id: 1, name: '東の海編', emoji: '🌊' },
    { id: 2, name: 'アラバスタ編', emoji: '🏜️' },
    { id: 3, name: '空島編', emoji: '☁️' },
    { id: 4, name: 'ウォーターセブン編', emoji: '🚢' },
    { id: 5, name: 'スリラーバーク編', emoji: '👻' },
    { id: 6, name: '頂上戦争編', emoji: '⚔️' },
    { id: 7, name: '魚人島編', emoji: '🐠' },
    { id: 8, name: 'パンクハザード編', emoji: '🔥' },
    { id: 9, name: 'ドレスローザ／ゾウ編', emoji: '🌹' },
    { id: 10, name: 'ホールケーキアイランド編', emoji: '🍰' },
    { id: 11, name: 'ワノ国編', emoji: '🗾' },
    { id: 12, name: 'エッグヘッド編', emoji: '🥚' },
    { id: 13, name: 'エルバフ編', emoji: '🗿' },
  ];

    // クエリを構築
    let query = supabase
      .from('questions')
      .select(`
        *,
        choices (*)
      `)
      .eq('story_arc_id', arcId);

    // 問題形式でフィルタ（allの場合はフィルタしない）
    if (format !== 'all') {
      query = query.eq('question_format', format);
    }

    const { data: questions, error } = await query;

    if (error || !questions || questions.length === 0) {
      console.error('Question fetch error:', error);
      setLoading(false);
      return;
    }

    let filteredQuestions = questions;

    // 未回答・誤答フィルター
    if (filter === 'unanswered' || filter === 'wrong') {
      if (!userId) {
        setLoading(false);
        return;
      }

      const questionIds = questions.map(q => q.id);

      // 各問題の最新の回答を取得
      const { data: latestAnswers } = await supabase
        .from('answer_history')
        .select('question_id, is_correct, answered_at')
        .eq('user_id', userId)
        .in('question_id', questionIds)
        .order('answered_at', { ascending: false });

      // 各問題の最新の回答のみを抽出
      const latestAnswersByQuestion = new Map<number, boolean>();
      latestAnswers?.forEach(answer => {
        if (!latestAnswersByQuestion.has(answer.question_id)) {
          latestAnswersByQuestion.set(answer.question_id, answer.is_correct);
        }
      });

      if (filter === 'unanswered') {
        // 未回答の問題のみ
        filteredQuestions = questions.filter(q => !latestAnswersByQuestion.has(q.id));
        console.log('📝 Unanswered questions:', filteredQuestions.length);
      } else if (filter === 'wrong') {
        // 誤答の問題のみ（最新の回答が不正解）
        filteredQuestions = questions.filter(q => {
          const isCorrect = latestAnswersByQuestion.get(q.id);
          return isCorrect === false; // 明示的にfalseの場合のみ
        });
        console.log('❌ Wrong questions:', filteredQuestions.length);
      }

      if (filteredQuestions.length === 0) {
        console.log('✅ No questions matching filter:', filter);
        setLoading(false);
        return;
      }
    }

    // 問題をシャッフル
    const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);
    
    // 問題数を制限（countが指定されている場合、filterがない場合のみ）
    const limitedQuestions = !filter && count > 0 
      ? shuffledQuestions.slice(0, count) 
      : shuffledQuestions;
    
    setAllQuestions(limitedQuestions as Question[]);
    setTotalQuestions(limitedQuestions.length);
    setCurrentQuestionIndex(0);
    setCorrectAnswers(0);
    
    // 最初の問題を表示
    if (limitedQuestions.length > 0) {
      const firstQuestion = limitedQuestions[0] as Question;
      const shuffled = shuffleChoices(firstQuestion.choices as Choice[]);
      setQuestion(firstQuestion);
      setShuffledChoices(shuffled);
    }

    //昇格試験結果画面
    const selectedArc = STORY_ARCS.find(a => a.id === arcId);
    setArcName(selectedArc?.name || '');
    setArcEmoji(selectedArc?.emoji || '');

    setLoading(false);
  };

  fetchAllQuestions();
}, [arcId, format, count, filter, userId]);

  const handleChoiceClick = (choiceId: number) => {
    if (showResult) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = async () => {
    if (selectedChoice === null) return;
    
    const selectedChoiceData = shuffledChoices.find(c => c.id === selectedChoice);
    const isCorrect = selectedChoiceData?.is_correct || false;
    
    // 回答履歴を保存
    if (userId && question) {
      try {
        await supabase
          .from('answer_history')
          .insert({
            user_id: userId,
            question_id: question.id,
            is_correct: isCorrect,
          });
        console.log('✅ Answer saved:', { question_id: question.id, is_correct: isCorrect });
      } catch (error) {
        console.error('❌ Error saving answer:', error);
      }
    }
    
    setShowResult(true);
  };

  // 複数選択問題の回答処理
  const handleMultipleChoiceAnswer = async (
    _selectedChoiceIds: number[], 
    isCorrect: boolean
  ) => {
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    // 回答履歴を保存
    if (userId && question) {
      try {
        await supabase
          .from('answer_history')
          .insert({
            user_id: userId,
            question_id: question.id,
            is_correct: isCorrect,
          });
        console.log('✅ Answer saved:', { question_id: question.id, is_correct: isCorrect });
      } catch (error) {
        console.error('❌ Error saving answer:', error);
      }
    }
  };

  // 進捗を更新
  const updateProgress = async (correct: number, total: number, examMode: string) => {
  if (!userId) return;

  let completionRate = 0;
  
  if (examMode === 'exam') {
    // 昇格試験モード: 全問正解のみ100%
    completionRate = correct === total ? 100 : 0;
  } else {
    // 練習モード: 正答率で計算
    completionRate = Math.min(Math.round((correct / total) * 100), 100);
  }
  
  let stars = 0;
  if (completionRate >= 100) {
    stars = 3;
  } else if (completionRate >= 70) {
    stars = 2;
  } else if (completionRate >= 40) {
    stars = 1;
  }
  
  try {
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('story_arc_id', arcId)
      .single();

    // 昇格試験モードで100%達成、または練習モードで記録更新の場合のみ更新
    const shouldUpdate = examMode === 'exam' 
      ? completionRate === 100 
      : !existingProgress || correct > (existingProgress.correct_answers || 0);

    if (shouldUpdate) {
      await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          story_arc_id: arcId,
          total_questions: total,
          correct_answers: correct,
          completion_rate: completionRate,
          stars: stars,
          is_unlocked: true,
          updated_at: new Date().toISOString(),
        });

      // 100%達成時のみ次のエリアをアンロック
      if (completionRate === 100) {
        await unlockNextArea();
      }
    }
  } catch (error) {
    console.error('Progress update error:', error);
  }
};

  const unlockNextArea = async () => {
    if (!userId) return;

    try {
      const { data: arcs } = await supabase
        .from('story_arcs')
        .select('*')
        .neq('id', 0)
        .order('order_num', { ascending: true });

      if (!arcs) return;

      const currentArc = arcs.find(arc => arc.id === arcId);
      if (!currentArc) return;

      const nextArc = arcs.find(arc => arc.order_num === currentArc.order_num + 1);
      if (!nextArc) return;

      const { data: nextProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('story_arc_id', nextArc.id)
        .single();

      if (!nextProgress || !nextProgress.is_unlocked) {
        await supabase
          .from('user_progress')
          .upsert({
            user_id: userId,
            story_arc_id: nextArc.id,
            correct_answers: 0,
            completion_rate: 0,
            is_unlocked: true,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Unlock next area error:', error);
    }
  };

  const handleNext = async () => {
  // 最後の問題の正誤を確認
  let finalCorrectCount = correctAnswers;
  
  if (question?.question_format !== 'multiple_choice') {
    const selectedChoiceData = shuffledChoices.find(c => c.id === selectedChoice);
    const isCorrect = selectedChoiceData?.is_correct || false;
    
    if (isCorrect) {
      finalCorrectCount = correctAnswers + 1;
      setCorrectAnswers(finalCorrectCount);
    }
  }

  if (currentQuestionIndex < allQuestions.length - 1) {
    // 次の問題へ
    const nextIndex = currentQuestionIndex + 1;
    const nextQuestion = allQuestions[nextIndex];
    const shuffled = shuffleChoices(nextQuestion.choices as Choice[]);
    
    setQuestion(nextQuestion);
    setShuffledChoices(shuffled);
    setSelectedChoice(null);
    setShowResult(false);
    setCurrentQuestionIndex(nextIndex);
  } else {
  // 最後の問題 - 進捗を更新してから結果画面を表示
  await updateProgress(finalCorrectCount, totalQuestions, mode);
  setShowQuizResult(true);
　}
};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">
          問題を読み込み中...
        </div>
      </div>
    );
  }

  if (showQuizResult) {
    return (
        <QuizResult
         mode={mode as 'exam' | 'practice'}
        correctAnswers={correctAnswers}
        totalQuestions={totalQuestions}
        arcId={arcId}
        arcName={arcName}
        arcEmoji={arcEmoji}
        />
     );
    }

  if (!question) {
    const getMessage = () => {
      if (filter === 'unanswered') {
        return '未回答の問題がありません。全ての問題に回答済みです！';
      } else if (filter === 'wrong') {
        return '誤答の問題がありません。全て正解しています！';
      }
      return '問題が見つかりません';
    };

    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#2C3E50] mb-4">
            {getMessage()}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-3 px-6 rounded-lg"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  if (question.question_format === 'multiple_choice') {
    return (
      <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              ← 戻る
            </button>
            <div className="flex items-center gap-4">
              <span className="bg-[#3498DB] text-white px-4 py-2 rounded-lg font-bold text-lg">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <span className="text-gray-600 font-bold">
                スコア: {correctAnswers} / {currentQuestionIndex}
              </span>
            </div>
          </div>

          <MultipleChoiceQuiz
            key={question.id}
            question={question as unknown as MultipleChoiceQuestion}
            onAnswer={handleMultipleChoiceAnswer}
            onNext={handleNext}
          />
        </div>
      </div>
    );
  }

  // 並べ替え問題の場合
  if (question.question_format === 'ordering') {
    return (
      <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              ← 戻る
            </button>
            <div className="flex items-center gap-4">
              <span className="bg-[#3498DB] text-white px-4 py-2 rounded-lg font-bold text-lg">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <span className="text-gray-600 font-bold">
                スコア: {correctAnswers} / {currentQuestionIndex}
              </span>
            </div>
          </div>

          <OrderingQuiz
            key={question.id}
            question={question as unknown as OrderingQuestion}
            onAnswer={async (isCorrect, _score) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
              
              // 回答履歴を保存
              if (userId && question) {
                try {
                  await supabase
                    .from('answer_history')
                    .insert({
                      user_id: userId,
                      question_id: question.id,
                      is_correct: isCorrect,
                    });
                  console.log('✅ Answer saved:', { question_id: question.id, is_correct: isCorrect });
                } catch (error) {
                  console.error('❌ Error saving answer:', error);
                }
              }
            }}
            onNext={handleNext}
          />
        </div>
      </div>
    );
  }

  //自由記述の場合
  if (question.question_format === 'free_text') {
    return (
      <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              ← 戻る
            </button>
            <div className="flex items-center gap-4">
              <span className="bg-[#3498DB] text-white px-4 py-2 rounded-lg font-bold text-lg">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <span className="text-gray-600 font-bold">
                スコア: {correctAnswers} / {currentQuestionIndex}
              </span>
            </div>
          </div>

          <FreeTextQuiz
            key={question.id}
            question={question as unknown as FreeTextQuestion}
            onAnswer={async (isCorrect, _score) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
              
              // 回答履歴を保存
              if (userId && question) {
                try {
                  await supabase
                    .from('answer_history')
                    .insert({
                      user_id: userId,
                      question_id: question.id,
                      is_correct: isCorrect,
                    });
                  console.log('✅ Answer saved:', { question_id: question.id, is_correct: isCorrect });
                } catch (error) {
                  console.error('❌ Error saving answer:', error);
                }
              }
            }}
            onNext={handleNext}
          />
        </div>
      </div>
    );
  }

  // 数値入力問題の場合
  if (question.question_format === 'numeric') {
    return (
      <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              ← 戻る
            </button>
            <div className="flex items-center gap-4">
              <span className="bg-[#3498DB] text-white px-4 py-2 rounded-lg font-bold text-lg">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <span className="text-gray-600 font-bold">
                スコア: {correctAnswers} / {currentQuestionIndex}
              </span>
            </div>
          </div>

          <NumericQuiz
            key={question.id}
            question={question as unknown as NumericQuestion}
            onAnswer={async (isCorrect, _score) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
              
              // 回答履歴を保存
              if (userId && question) {
                try {
                  await supabase
                    .from('answer_history')
                    .insert({
                      user_id: userId,
                      question_id: question.id,
                      is_correct: isCorrect,
                    });
                  console.log('✅ Answer saved:', { question_id: question.id, is_correct: isCorrect });
                } catch (error) {
                  console.error('❌ Error saving answer:', error);
                }
              }
            }}
            onNext={handleNext}
          />
        </div>
      </div>
    );
  }

  const selectedChoiceData = shuffledChoices.find(c => c.id === selectedChoice);
  const isCorrect = selectedChoiceData?.is_correct || false;

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            ← 戻る
          </button>
          <div className="flex items-center gap-4">
            <span className="bg-[#3498DB] text-white px-4 py-2 rounded-lg font-bold text-lg">
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              question.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
              question.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
              'bg-red-200 text-red-800'
            }`}>
              {question.difficulty}
            </span>
            <span className="text-[#F39C12] font-bold text-lg">
              +{question.points}pt
            </span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50] mb-6">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6">
            {question.question_text}
          </h2>

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
        </div>

        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null}
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
              {question.explanation && (
                <p className="text-gray-700 font-medium">
                  💡 {question.explanation}
                </p>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors"
            >
              {currentQuestionIndex < totalQuestions - 1 ? '次の問題へ →' : '結果を見る'}
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-gray-600 font-bold">
          現在のスコア: {correctAnswers} / {currentQuestionIndex + (showResult ? 1 : 0)} 問正解
        </div>
      </div>
    </div>
  );
}