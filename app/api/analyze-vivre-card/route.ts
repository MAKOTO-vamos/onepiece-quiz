// app/api/analyze-vivre-card/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: '画像が提供されていません' },
        { status: 400 }
      );
    }

    // Gemini API Key（環境変数から取得）
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API Keyが設定されていません' },
        { status: 500 }
      );
    }

    // Gemini API呼び出し
    // gemini-2.5-flash を使用（最新・高性能・コスパ良い）
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `この画像はONE PIECEのビブルカードです。以下の項目を抽出してJSON形式で返してください。

抽出項目:
- card_number: カード番号（数値）
- character_name: キャラクター名
- label: ラベル（例: 麦わらの一味）
- affiliation: 所属
- position: 役職
- epithet: 二つ名
- devil_fruit: 悪魔の実の名前
- haki: 覇気（武装色、見聞色、覇王色）
- gender: 性別
- birthday: 誕生日（YYYY-MM-DD形式）
- age: 年齢（数値）
- height: 身長（cm、数値）
- bounty: 懸賞金（ベリー、数値）
- description: 説明文

重要:
- 読み取れない項目はnullにしてください
- 数値は必ず数値型で返してください
- 日付はYYYY-MM-DD形式で返してください
- JSONのみを返し、他の説明文は不要です

出力フォーマット例:
{
  "card_number": 1,
  "character_name": "モンキー・D・ルフィ",
  "label": "麦わらの一味",
  "affiliation": "麦わらの一味",
  "position": "船長",
  "epithet": "麦わらのルフィ",
  "devil_fruit": "ヒトヒトの実 幻獣種 モデルニカ",
  "haki": "武装色、見聞色、覇王色",
  "gender": "男",
  "birthday": "2000-05-05",
  "age": 19,
  "height": 174,
  "bounty": 3000000000,
  "description": "麦わらの一味の船長。ゴムゴムの実の能力者。"
}`,
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192, // 増やす（デフォルト2048 → 8192）
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API Error:', errorData);
      throw new Error('Gemini API呼び出しに失敗しました');
    }

    const data = await response.json();
    
    // レスポンスからテキストを抽出
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('AIからのレスポンスが空です');
    }

    console.log('📝 AI Response:', generatedText);

    // JSONを抽出（マークダウンのコードブロックを除去）
    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // JSONをパース
    const extractedData = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      extracted_data: extractedData,
      raw_response: generatedText,
    });

  } catch (error) {
    console.error('Error analyzing vivre card:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '解析エラー',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}