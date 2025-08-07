
import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { Paragraph } from '@/types';

export async function POST(request: Request) {
  try {
    const { title, paragraphs }: { title: string; paragraphs: Paragraph[] } = await request.json();
    const fullText = paragraphs.map((p) => p.content).join('\n\n');

    // 프롬프트 문자열 가독성 및 불필요한 줄바꿈 제거
    const prompt = [
      'As a writing assistant, create a concise, one-sentence summary for the following webnovel episode.',
      'The summary should capture the main event or the key emotional shift of the episode.',
      '',
      `Episode Title: ${title}`,
      '',
      'Episode Content:',
      fullText,
      '',
      '---',
      '',
      'One-sentence Summary:'
    ].join('\n');

    const result = await geminiModel.generateContent(prompt);
    const summary = (await result.response.text()).trim();

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error generating episode summary:', errMsg);
    return NextResponse.json({ error: 'Failed to generate episode summary' }, { status: 500 });
  }
}
