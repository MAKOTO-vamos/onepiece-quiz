import QuizGame from '@/components/quiz/QuizGame';

interface QuizPageProps {
  params: Promise<{
    arcId: string;
  }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { arcId } = await params;
  return <QuizGame arcId={parseInt(arcId)} />;
}