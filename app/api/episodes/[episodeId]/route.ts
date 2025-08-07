import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

type Paragraphs = Database['public']['Tables']['paragraphs']['Row'];

// 특정 에피소드와 문단들 가져오기
export async function GET(request: Request, { params }: { params: { episodeId: string } }) {
  const { data, error } = await supabase
    .from('episodes')
    .select('*, paragraphs(*)')
    .eq('id', params.episodeId)
    .single();

  if (error) {
    // 404 Not Found와 같은 더 구체적인 에러 처리가 필요할 수 있음
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 특정 에피소드 수정하기
export async function PATCH(request: Request, { params }: { params: { episodeId: string } }) {
  const { title, paragraphs, summary }: {
    title?: string;
    summary?: string;
    paragraphs?: Paragraphs[];
  } = await request.json();

  // 실제 프로덕션에서는 Supabase Edge Function을 사용하여
  // 아래의 여러 쿼리를 하나의 트랜잭션으로 묶는 것이 안전합니다.

  // 1. 에피소드 제목, 요약 등 업데이트
  const { error: episodeError } = await supabase
    .from('episodes')
    .update({ title, summary })
    .eq('id', params.episodeId);

  if (episodeError) {
    return NextResponse.json({ error: `Episode update failed: ${episodeError.message}` }, { status: 500 });
  }

  // 2. 문단들 업데이트 (upsert)
  if (paragraphs) {
    // paragraphs 배열에 episode_id가 없는 경우 추가
    const paragraphsToUpsert = paragraphs.map((p) => ({ ...p, episode_id: params.episodeId }));
    
    const { error: paragraphError } = await supabase
      .from('paragraphs')
      .upsert(paragraphsToUpsert);
    
    if (paragraphError) {
      return NextResponse.json({ error: `Paragraph update failed: ${paragraphError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Episode updated successfully' });
}

// 특정 에피소드 삭제하기
export async function DELETE(request: Request, { params }: { params: { episodeId: string } }) {
    const { error } = await supabase.from('episodes').delete().eq('id', params.episodeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Episode deleted successfully' }, { status: 200 });
}
