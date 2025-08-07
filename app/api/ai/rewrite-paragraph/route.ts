import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { Paragraph, ReferenceCard } from '@/types';

export async function POST(request: Request) {
  try {
    const { targetParagraph, referenceCard, rawContext } = await request.json();

    let context = '';
    if (rawContext) {
      if (rawContext.documentSnippets && rawContext.documentSnippets.length > 0) {
        context += '\n[업로드 문서에서 참고할 만한 정보]\n';
        for (const doc of rawContext.documentSnippets) {
          context += `- (${doc.filename}) ${doc.snippet}\n`;
        }
      }
      if (rawContext.webResults && rawContext.webResults.length > 0) {
        context += '\n[웹 검색 결과]\n';
        for (const w of rawContext.webResults) {
          context += `- ${w.title}: ${w.snippet}\n`;
        }
      }
      if (rawContext.allEpisodes && rawContext.allEpisodes.length > 0) {
        context += '\n[모든 에피소드 요약]\n';
        for (const ep of rawContext.allEpisodes) {
          context += `- ${ep.title}: ${ep.summary}\n`;
        }
      }
    }

    const prompt = `
      As a writing assistant for a webnovel author, rewrite the following paragraph to be more vivid and engaging, using the information from the provided reference card and all the context below.
      Do not change the core meaning, but enhance the description, dialogue, or pacing. Use any relevant facts or details from the context if helpful.
      Respond with only the rewritten paragraph text, without any extra explanations or markdown.

      Original Paragraph:
      "${targetParagraph.content}"

      ---

      Reference Card to Apply:
      - Title: ${referenceCard.title}
      - Summary: ${referenceCard.summary}

      ---
      ${context}
      Rewritten Paragraph:
    `;

    const result = await geminiModel.generateContent(prompt);
    const rewrittenText = await result.response.text();

    return NextResponse.json({ rewrittenText });

  } catch (error) {
    console.error('Error rewriting paragraph:', error);
    return NextResponse.json({ error: 'Failed to rewrite paragraph' }, { status: 500 });
  }
}
