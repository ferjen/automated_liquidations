import { NextRequest, NextResponse } from 'next/server';
import { analyzeReceiptImage, getReceiptText } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    console.log('Parse API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Image converted to base64, length:', base64.length);

    // Use Gemini to analyze the receipt image
    console.log('Calling Gemini API...');
    const [parsedData, fullText] = await Promise.all([
      analyzeReceiptImage(base64),
      getReceiptText(base64)
    ]);

    console.log('Gemini API calls completed successfully');
    return NextResponse.json({
      parsed: parsedData,
      fullText: fullText
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse receipt image' },
      { status: 500 }
    );
  }
}


