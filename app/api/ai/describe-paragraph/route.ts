import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { Paragraph } from '@/types';

// POST /api/ai/describe-paragraph
export async function POST(request: Request) {
  try {
    const { paragraph }: { paragraph: Paragraph } = await request.json();

    // 프롬프트: 해당 문단의 묘사만 추출/생성
    const prompt = `
      아래의 웹소설 문단을 읽고, 이 문단의 분위기, 배경, 감각적 묘사, 심리 등 독자가 장면을 더 생생하게 느낄 수 있도록 도와주는 "묘사"만을 한글로 2~3문장 생성해줘. 대사는 포함하지 말고, 오직 묘사만 생성해줘.\n\n문단:\n"${paragraph.content}"
      ---
      [묘사 예시]
      - 어둠이 깔린 골목길에 희미한 가로등 불빛이 번졌다.
      - 주인공의 심장은 두려움에 조용히 뛰고 있었다.
      ---
      반드시 한글로, 2~3문장, 대사 없이, 묘사만 반환해줘.
    `;

    const result = await geminiModel.generateContent(prompt);
    const responseText = await result.response.text();

    // 응답에서 묘사만 추출 (불필요한 텍스트 제거)
    const description = responseText.trim().replace(/^\s*-\s*/gm, '').replace(/\n+/g, ' ');

    return NextResponse.json({ description });
  } catch (e) {
    return NextResponse.json({ error: '묘사 생성 실패', detail: String(e) }, { status: 500 });
  }
}
export {};
