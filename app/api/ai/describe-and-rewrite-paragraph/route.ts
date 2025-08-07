import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { Episode, Paragraph } from '@/types';

// POST /api/ai/describe-and-rewrite-paragraph
export async function POST(request: Request) {
  try {
    const { paragraph, episode, episodeSummary, relatedEpisodes } = await request.json();
    // relatedEpisodes: [{title, summary, paragraphs}[]] (optional)

    // 프롬프트 구성
    let context = `에피소드 제목: ${episode.title}\n`;
    if (episodeSummary) context += `에피소드 요약: ${episodeSummary}\n`;
    context += `에피소드 전체 문단:\n${(episode.paragraphs as Paragraph[]).map((p, i) => `${i+1}. ${p.content}`).join('\n')}\n`;
    if (relatedEpisodes && relatedEpisodes.length > 0) {
      context += `\n참고할 수 있는 기존 에피소드와 요약:\n`;
      for (const ep of relatedEpisodes) {
        context += `- [${ep.title}] 요약: ${ep.summary}\n`;
      }
    }

    const prompt = `\n${context}\n---\n아래의 문단을 위 맥락에 맞게 더 구체적이고 생생한 묘사(분위기, 배경, 감각, 심리 등)를 추가하여 2~3배 길이로 확장해줘. 대사는 포함하지 말고, 자연스러운 소설 문장으로 변환해줘.\n\n[대상 문단]\n"${paragraph.content}"\n---\n[확장된 묘사 문단] (한글, 대사 없이, 소설 문장만)\n`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = await result.response.text();
    const rewritten = responseText.trim();

    return NextResponse.json({ rewritten });
  } catch (e) {
    return NextResponse.json({ error: '묘사 확장 실패', detail: String(e) }, { status: 500 });
  }
}
