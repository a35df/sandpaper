import { NextResponse } from 'next/server';

// DuckDuckGo Instant Answer API (키 필요 없음)
const DDG_ENDPOINT = 'https://api.duckduckgo.com/';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const url = `${DDG_ENDPOINT}?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();
    // 관련 정보 추출
    const results = [];
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.AbstractText
      });
    }
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text) {
          results.push({
            title: topic.Text.split('-')[0].trim(),
            url: topic.FirstURL || '',
            snippet: topic.Text
          });
        }
      }
    }
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
