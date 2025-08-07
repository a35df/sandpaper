// app/api/episodes/[episodeId]/paragraphs/[paragraphId]/new-related-cards/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// 이 함수는 app/api/ai/generate-cards/route.ts 와 매우 유사하게 동작해야 합니다.
// 지금은 간소화된 버전으로 구현합니다.
async function generateNewCardsFromContext(paragraphContent: string, existingCardContext: any): Promise<any[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
    [목표]
    주어진 '기존 문단'과 '기존 참조 카드 정보'를 바탕으로, 연관성이 높으면서도 새로운 관점을 제공할 수 있는 새로운 참조 카드 3개를 생성해주세요.

    [입력]
    1.  기존 문단:
        ${paragraphContent}

    2.  기존 참조 카드 정보 (이것을 대체하거나 보완할 새로운 아이디어가 필요합니다):
        ${JSON.stringify(existingCardContext, null, 2)}

    [출력 형식]
    반드시 다음의 JSON 형식에 맞춰, 3개의 카드 객체를 포함하는 배열을 반환해주세요. 각 객체는 title과 summary를 포함해야 합니다.
    [
      { "title": "...", "summary": "..." },
      { "title": "...", "summary": "..." },
      { "title": "...", "summary": "..." }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // AI가 생성한 텍스트에서 JSON 부분만 추출
    const jsonString = response.text().match(/(\[[\s\S]*\])/)?.[0];
    if (jsonString) {
      return JSON.parse(jsonString);
    }
    return [];
  } catch (error) {
    console.error('Error generating new cards with AI:', error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { paragraphId: string } }
) {
  const supabase = createClient();
  const { paragraphId } = params;
  const { current_card_id } = await request.json();

  if (!current_card_id) {
    return NextResponse.json({ error: 'current_card_id is required' }, { status: 400 });
  }

  try {
    // 1. 필요한 데이터 조회 (문단, 현재 적용된 카드)
    const { data: paragraph, error: pError } = await supabase
      .from('paragraphs')
      .select('content')
      .eq('id', paragraphId)
      .single();

    const { data: currentCard, error: cError } = await supabase
      .from('reference_cards')
      .select('*') // 나중에 rawContext만 선택하도록 최적화 가능
      .eq('id', current_card_id)
      .single();

    if (pError || cError || !paragraph || !currentCard) {
      return NextResponse.json({ error: 'Paragraph or current card not found' }, { status: 404 });
    }

    // 2. AI를 통해 새로운 카드 3개 생성
    const newCardsData = await generateNewCardsFromContext(paragraph.content || '', currentCard.rawContext);

    // 3. 새로운 카드들을 임시 객체로 만듦 (DB에 저장하지 않음)
    const newCards = newCardsData.map(cardData => ({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      ...cardData,
      isPinned: false,
      group: null,
      isInHold: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rawContext: {}, // 새 카드는 임시이므로 rawContext가 없음
    }));

    // 4. 기존 카드와 새로운 카드 3개를 합쳐서 반환
    const finalCards = [currentCard, ...newCards];

    return NextResponse.json(finalCards);
  } catch (error) {
    console.error('Error fetching new related cards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
