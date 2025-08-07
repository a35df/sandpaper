// FINAL FIX: This comment MUST be visible on GitHub to verify the latest commit is deployed.
// Timestamp: 2025-08-07 11:50
import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { Episode, Paragraph, ReferenceCard } from '@/types';

// POST 요청을 처리하는 함수
export async function POST(request: Request) {
  try {
    const { episodeContext, targetParagraph, allEpisodes, documentSnippets, webResults } = await request.json();

    // 프롬프트에 모든 맥락, 문서, 웹 결과 포함
    let prompt = `웹소설 작가의 AI 어시스턴트로서, 아래 맥락과 자료를 참고해 6개의 참조 카드를 생성해줘.\n`;
    prompt += `\n[에피소드 제목]\n${episodeContext.title}`;
    prompt += `\n[에피소드 전체 문단]\n${episodeContext.paragraphs.map((p: Paragraph) => p.content).join('\n')}`;
    if (allEpisodes) {
      prompt += `\n[모든 에피소드 요약]\n`;
      for (const ep of allEpisodes) {
        prompt += `- ${ep.title}: ${ep.summary}\n`;
      }
    }
    prompt += `\n[대상 문단]\n"${targetParagraph.content}"`;
    if (documentSnippets && documentSnippets.length > 0) {
      prompt += `\n[업로드 문서에서 참고할 만한 정보]\n`;
      for (const doc of documentSnippets) {
        prompt += `- (${doc.filename}) ${doc.snippet}\n`;
      }
    }
    if (webResults && webResults.length > 0) {
      prompt += `\n[웹 검색 결과]\n`;
      for (const w of webResults) {
        prompt += `- ${w.title}: ${w.snippet}\n`;
      }
    }
    prompt += `\n---\n각 카드는 실제로 참고할 만한 정보(팩트, 배경, 디테일, 동기, 대사 등)를 제목(1~3단어)과 요약(1~2문장)으로 제공해줘. 반드시 JSON 배열로 반환.\n`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = await result.response.text();

    // Gemini 응답에서 JSON 부분만 추출
    const jsonResponse = responseText.match(/\[[\s\S]*\]/);
    if (!jsonResponse) {
      throw new Error('Invalid JSON response from AI');
    }

    const cards: Omit<ReferenceCard, 'id' | 'isPinned' | 'group' | 'isInHold'>[] = JSON.parse(jsonResponse[0]);

    // 클라이언트에 생성된 카드 목록을 반환
    return NextResponse.json(cards);

  } catch (error) {
    console.error('Error generating reference cards:', error);
    return NextResponse.json({ error: 'Failed to generate cards' }, { status: 500 });
  }
}