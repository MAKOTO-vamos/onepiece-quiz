// app/quiz/knowledge/play/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MultipleChoiceQuiz from '@/components/quiz/MultipleChoiceQuiz';
import OrderingQuiz from '@/components/quiz/OrderingQuiz';
import FreeTextQuiz from '@/components/quiz/FreeTextQuiz';
import NumericQuiz from '@/components/quiz/NumericQuiz';
import QuizResult from '@/components/quiz/QuizResult';
import type { 
  Question, 
  MultipleChoiceQuestion, 
  OrderingQuestion, 
  FreeTextQuestion, 
  NumericQuestion 
} from '@/types/questions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORY_INFO: Record<string, { name: string; emoji: string }> = {
  'character': { name: 'キャラクター', emoji: '👤' },
  'technique': { name: '技・能力', emoji: '⚡' },
  'location': { name: '地名・国名', emoji: '🗺️' },
  'term': { name: '用語・設定', emoji: '📚' },
  'relationship': { name: '人間関係', emoji: '💬' },
  'timeline': { name: '時系列・順序', emoji: '⏰' },
  'organization': { name: '組織・団体', emoji: '🏛️' },
  'item': { name: 'アイテム・武器', emoji: '⚔️' },
};

export default function KnowledgeQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '';
  const format = searchParams.get('format') || 'all';
  const count = parseInt(searchParams.get('count') || '0');
  
  const categoryInfo = CATEGORY_INFO[category];

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      // 問題を取得
      let query = supabase
        .from('questions')
        .select(`
          *,
          choices (*)
        `)
        .eq('learning_mode', 'knowledge_base')
        .eq('knowledge_category', category);

      if (format !== 'all') {
        query = query.eq('question_format', format);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching questions:', error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.error('No questions found');
        setLoading(false);
        return;
      }

      // 問題をシャッフル
      const shuffledQuestions = [...data].sort(() => Math.random() - 0.5);

      // 問題数を制限
      const limitedQuestions = count > 0 
        ? shuffledQuestions.slice(0, count) 
        : shuffledQuestions;

      setQuestions(limitedQuestions as Question[]);
      setLoading(false);
    };

    fetchQuestions();
  }, [category, format, count]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#2C3E50]">問題を読み込み中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😢</div>
          <div className="text-2xl font-bold text-[#2C3E50] mb-4">問題が見つかりません</div>
          <button
            onClick={() => router.push('/knowledge')}
            className="bg-[#2C3E50] text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-800"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <QuizResult
        mode="practice"
        correctAnswers={correctAnswers}
        totalQuestions={questions.length}
        arcId={0}
        arcName={categoryInfo.name}
        arcEmoji={categoryInfo.emoji}
      />
    );
  }

  const question = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#FDF6E3] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button onClick={() => router.push('/knowledge')} className="text-[#2C3E50] hover:underline mb-2">
            ← 戻る
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#2C3E50]">
                {categoryInfo.emoji} {categoryInfo.name}
              </h1>
              <p className="text-gray-600">
                問題 {currentIndex + 1} / {questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">正解数</p>
              <p className="text-3xl font-bold text-[#2C3E50]">{correctAnswers}</p>
            </div>
          </div>
          
          {/* プログレスバー */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[#2C3E50] h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題表示 */}
        {(question.question_format === 'single_choice' || question.question_format === 'multiple_choice') && (
          <MultipleChoiceQuiz
            key={question.id}
            question={question as unknown as MultipleChoiceQuestion}
            onAnswer={(_: number[], isCorrect: boolean) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
            }}
            onNext={handleNext}
          />
        )}

        {question.question_format === 'ordering' && (
          <OrderingQuiz
            key={question.id}
            question={question as unknown as OrderingQuestion}
            onAnswer={(isCorrect: boolean) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
            }}
            onNext={handleNext}
          />
        )}

        {question.question_format === 'free_text' && (
          <FreeTextQuiz
            key={question.id}
            question={question as unknown as FreeTextQuestion}
            onAnswer={(isCorrect: boolean) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
            }}
            onNext={handleNext}
          />
        )}

        {question.question_format === 'numeric' && (
          <NumericQuiz
            key={question.id}
            question={question as unknown as NumericQuestion}
            onAnswer={(isCorrect: boolean) => {
              if (isCorrect) {
                setCorrectAnswers(prev => prev + 1);
              }
            }}
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  );
}