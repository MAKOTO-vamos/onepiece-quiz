// app/promotion-exam/[arcId]/[prevArcId]/page.tsx
'use client';

import { use } from 'react';
import PromotionExam from '@/components/promotion/PromotionExam';

interface PageParams {
  arcId: string;
  prevArcId: string;
}

interface PromotionExamPageProps {
  params: Promise<PageParams>;
}

export default function PromotionExamPage({ params }: PromotionExamPageProps) {
  const { arcId, prevArcId } = use(params);

  return (
    <PromotionExam 
      arcId={Number(arcId)} 
      prevArcId={Number(prevArcId)} 
    />
  );
}