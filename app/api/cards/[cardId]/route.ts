import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// 특정 카드 업데이트 (Pin, Group, Hold 등)
export async function PATCH(request: Request, { params }: { params: { cardId: string } }) {
  const updates: {
    isPinned?: boolean;
    isInHold?: boolean;
    group?: string | null;
  } = await request.json();

  // JavaScript의 camelCase (isPinned)를 DB의 snake_case (is_pinned)로 변환
  const updatesForDb: { [key: string]: any } = {};
  if (updates.isPinned !== undefined) updatesForDb.is_pinned = updates.isPinned;
  if (updates.isInHold !== undefined) updatesForDb.is_in_hold = updates.isInHold;
  if (updates.group !== undefined) updatesForDb.group = updates.group;

  if (Object.keys(updatesForDb).length === 0) {
    return NextResponse.json({ message: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reference_cards')
    .update(updatesForDb)
    .eq('id', params.cardId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
