import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(DOCUMENTS_DIR, file.name);
    await fs.writeFile(filePath, buffer);
    return NextResponse.json({ success: true, filename: file.name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
