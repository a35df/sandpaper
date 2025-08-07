import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const files = await fs.readdir(DOCUMENTS_DIR);
    let results: { filename: string; snippet: string }[] = [];
    for (const filename of files) {
      const filePath = path.join(DOCUMENTS_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      // 간단한 키워드 매칭 (실제 서비스에서는 embedding/벡터 검색 추천)
      if (content.includes(query)) {
        // 첫 번째 매칭 문장 추출
        const idx = content.indexOf(query);
        const snippet = content.slice(Math.max(0, idx - 30), idx + query.length + 30);
        results.push({ filename, snippet });
      }
    }
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
