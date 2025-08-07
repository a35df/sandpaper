// app/api/episodes/[episodeId]/paragraphs/[paragraphId]/card-history/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { paragraphId: string } }
) {
  const supabase = createClient();
  const { paragraphId } = params;

  try {
    // 1. 문단에서 카드 히스토리 ID 목록 조회
    const { data: paragraph, error: fetchError } = await supabase
      .from('paragraphs')
      .select('applied_card_history')
      .eq('id', paragraphId)
      .single();

    if (fetchError || !paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    const cardIds = paragraph.applied_card_history;

    if (!cardIds || cardIds.length === 0) {
      return NextResponse.json([]);
    }

    // 2. 카드 ID 목록을 사용하여 실제 카드 정보 조회
    const { data: cards, error: cardsError } = await supabase
      .from('reference_cards')
      .select('*')
      .in('id', cardIds);

    if (cardsError) {
      throw cardsError;
    }

    // 히스토리 순서대로 카드 정렬 (최신이 위로)
    const sortedCards = cardIds
      .map(id => cards.find(card => card.id === id))
      .filter(Boolean)
      .reverse(); // 최신이 배열의 마지막에 있으므로 reverse

    return NextResponse.json(sortedCards);
  } catch (error) {
    console.error('Error fetching card history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
