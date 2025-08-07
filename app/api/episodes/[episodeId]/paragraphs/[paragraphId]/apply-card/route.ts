// app/api/episodes/[episodeId]/paragraphs/[paragraphId]/apply-card/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

async function getReferenceCardCoreInfo(supabase: any, cardId: string): Promise<any> {
  // 실제 구현에서는 reference_cards 테이블에서 '핵심 정보'를 가져와야 합니다.
  // 지금은 rawContext를 '핵심 정보'로 가정하고 사용합니다.
  const { data, error } = await supabase
    .from('reference_cards')
    .select('rawContext')
    .eq('id', cardId)
    .single();
  
  if (error || !data) {
    console.error('Failed to fetch reference card a a a a a a a a a a a', error);
    return null;
  }
  return data.rawContext;
}

async function rewriteParagraphWithAI(paragraphContent: string, context: any): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `다음 문단을 주어진 컨텍스트 정보를 활용하여 더 풍부하고 상세하게 재작성해주세요. 문단의 핵심 의미는 유지하되, 컨텍스트를 자연스럽게 녹여내서 내용을 확장해야 합니다. 결과는 재작성된 문단 텍스트만 포함해야 합니다.\n\n---\n\n[기존 문단]:\n${paragraphContent}\n\n[컨텍스트 정보]:\n${JSON.stringify(context, null, 2)}\n\n---\n\n[재작성된 문단]:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error rewriting paragraph with AI:', error);
    throw new Error('AI rewriting failed');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { paragraphId: string } }
) {
  const supabase = createClient();
  const { paragraphId } = params;
  const { reference_card_id } = await request.json();

  if (!reference_card_id) {
    return NextResponse.json({ error: 'reference_card_id is required' }, { status: 400 });
  }

  try {
    // 1. 필요한 데이터 조회 (문단, 참조 카드)
    const { data: paragraph, error: fetchError } = await supabase
      .from('paragraphs')
      .select('content, content_history, applied_card_history')
      .eq('id', paragraphId)
      .single();

    if (fetchError || !paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    const coreInfo = await getReferenceCardCoreInfo(supabase, reference_card_id);
    if (!coreInfo) {
      return NextResponse.json({ error: 'Reference card not found or has no context' }, { status: 404 });
    }
    
    // 2. AI로 문단 재작성
    const rewrittenContent = await rewriteParagraphWithAI(paragraph.content || '', coreInfo);

    // 3. 히스토리 업데이트 준비
    const newContentHistory = [...(paragraph.content_history || []), paragraph.content || ''];
    const newAppliedCardHistory = [...(paragraph.applied_card_history || []), reference_card_id];

    // 4. 문단 업데이트
    const { data: updatedParagraph, error: updateError } = await supabase
      .from('paragraphs')
      .update({
        content: rewrittenContent,
        content_history: newContentHistory,
        applied_card_history: newAppliedCardHistory,
      })
      .eq('id', paragraphId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedParagraph);
  } catch (error) {
    console.error('Error applying card to paragraph:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
