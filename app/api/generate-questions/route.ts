import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const questionCount = formData.get('questionCount') as string;

    if (!file) {
      return NextResponse.json({ error: 'PDFファイルが必要です' }, { status: 400 });
    }

    // PDFをBase64に変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Gemini APIで問題生成
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash'
    });

    const prompt = `
あなたはONE PIECEの知識問題を作成するAIです。
以下のPDFから、${questionCount}問のクイズ問題を生成してください。

重要：各問題について、その内容が該当するエリア（story_arc_id）を自動判定してください。

エリア一覧：
0. 未分類（エリアが特定できない場合）
1. イーストブルー (第1-12巻)
2. アラバスタ (第12-24巻)
3. スカイピア (第24-32巻)
4. ウォーターセブン (第32-46巻)
5. スリラーバーク (第46-50巻)
6. シャボンディ諸島 (第50-53巻)
7. マリンフォード (第53-61巻)
8. 魚人島 (第61-66巻)
9. パンクハザード (第66-70巻)
10. ドレスローザ (第70-80巻)
11. ゾウ (第80-82巻)
12. ホールケーキアイランド (第82-90巻)
13. ワノ国 (第90-105巻)

出力形式（JSON以外の文字は出力しないでください）：

{
  "questions": [
    {
      "story_arc_id": 1,
      "question_text": "問題文",
      "difficulty": "easy" または "medium" または "hard",
      "points": 10,
      "explanation": "解説文",
      "choices": [
        { "text": "選択肢1", "is_correct": true },
        { "text": "選択肢2", "is_correct": false },
        { "text": "選択肢3", "is_correct": false },
        { "text": "選択肢4", "is_correct": false }
      ]
    }
  ]
}

重要な制約：
- 各問題には必ず4つの選択肢を用意してください
- 正解は必ず1つだけにしてください
- story_arc_idは問題の内容から適切に判定してください
- エリアが特定できない場合や複数エリアにまたがる場合は0（未分類）を指定してください
- difficultyは問題の難易度に応じて設定してください
- explanationには詳しい解説を含めてください
- JSON以外の文字は出力しないでください（マークダウンのコードブロックも不要）
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    let generatedText = response.text();

    // マークダウンのコードブロックを削除
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // JSONをパース
    const questionsData = JSON.parse(generatedText);

    return NextResponse.json(questionsData);
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '問題の生成に失敗しました' },
      { status: 500 }
    );
  }
}