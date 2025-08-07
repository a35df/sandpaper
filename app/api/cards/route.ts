import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// 모든 참조 카드 목록 가져오기
export async function GET() {
  const { data, error } = await supabase
    .from('reference_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 새로운 참조 카드들 생성하기
export async function POST(request: Request) {
  const cardsToCreate: {
    title: string;
    summary: string;
    isPinned: boolean;
    group: string | null;
    isInHold: boolean;
  }[] = await request.json();

  // Supabase는 is_pinned, is_in_hold와 같이 snake_case를 사용하므로 변환 필요
  const formattedCards = cardsToCreate.map((card) => ({
    title: card.title,
    summary: card.summary,
    is_pinned: card.isPinned,
    group: card.group,
    is_in_hold: card.isInHold,
  }));

  const { data, error } = await supabase
    .from('reference_cards')
    .insert(formattedCards)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
