// app/api/episodes/[episodeId]/paragraphs/[paragraphId]/undo/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { paragraphId: string } }
) {
  const supabase = createClient();
  const { paragraphId } = params;

  try {
    // 1. 해당 문단 조회
    const { data: paragraph, error: fetchError } = await supabase
      .from('paragraphs')
      .select('content, content_history')
      .eq('id', paragraphId)
      .single();

    if (fetchError || !paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    // 2. 히스토리가 없으면 되돌릴 수 없음
    if (!paragraph.content_history || paragraph.content_history.length === 0) {
      return NextResponse.json({ error: 'No history to undo' }, { status: 400 });
    }

    // 3. 히스토리에서 마지막 내용 꺼내기
    const newContentHistory = [...paragraph.content_history];
    const lastContent = newContentHistory.pop();

    // 4. 문단 내용 업데이트
    const { data: updatedParagraph, error: updateError } = await supabase
      .from('paragraphs')
      .update({
        content: lastContent,
        content_history: newContentHistory,
      })
      .eq('id', paragraphId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedParagraph);
  } catch (error) {
    console.error('Error undoing paragraph content:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
