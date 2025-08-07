// app/api/cards/bulk-hold/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { card_ids } = await request.json();

  if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
    return NextResponse.json({ error: 'card_ids array is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('reference_cards')
      .update({ isInHold: true })
      .in('id', card_ids)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error('Error bulk holding cards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
