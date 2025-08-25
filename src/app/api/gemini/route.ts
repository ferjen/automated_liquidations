import { NextRequest, NextResponse } from 'next/server';
import { generateText, generateTextAdvanced, chatWithGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode = 'simple', options = {} } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    let response: string;

    switch (mode) {
      case 'advanced':
        response = await generateTextAdvanced(prompt, options);
        break;
      case 'chat':
        const { messages } = options;
        if (!messages || !Array.isArray(messages)) {
          return NextResponse.json(
            { error: 'Messages array is required for chat mode' },
            { status: 400 }
          );
        }
        response = await chatWithGemini(messages);
        break;
      case 'simple':
      default:
        response = await generateText(prompt);
        break;
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response from Gemini AI' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gemini AI API endpoint',
    availableModes: ['simple', 'advanced', 'chat'],
    models: ['GEMINI_PRO', 'GEMINI_FLASH', 'GEMINI_PRO_VISION'],
  });
}
