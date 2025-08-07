import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// 모든 에피소드 목록 가져오기
export async function GET() {
  const { data, error } = await supabase
    .from('episodes')
    .select('id, title, summary, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 새로운 에피소드 생성하기
export async function POST(request: Request) {
  const { title, paragraphs }: { title: string; paragraphs: { content: string; order: number }[] } = await request.json();

  // 1. 에피소드 생성
  const { data: episodeData, error: episodeError } = await supabase
    .from('episodes')
    .insert({ title })
    .select()
    .single();

  if (episodeError) {
    return NextResponse.json({ error: episodeError.message }, { status: 500 });
  }

  // 2. 문단들 생성
  if (paragraphs && paragraphs.length > 0) {
    const paragraphDataToInsert = paragraphs.map((p) => ({
      content: p.content,
      order: p.order,
      episode_id: episodeData.id,
    }));

    const { error: paragraphError } = await supabase
      .from('paragraphs')
      .insert(paragraphDataToInsert);

    if (paragraphError) {
      // 간단한 롤백: 방금 생성한 에피소드 삭제
      await supabase.from('episodes').delete().eq('id', episodeData.id);
      return NextResponse.json({ error: paragraphError.message }, { status: 500 });
    }
  }

  return NextResponse.json(episodeData, { status: 201 });
}
