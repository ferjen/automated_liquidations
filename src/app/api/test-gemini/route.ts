import { NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';

export async function GET() {
  try {
    console.log('Testing Gemini API connection...');
    
    const response = await generateText('Hello, this is a test message.');
    
    return NextResponse.json({
      success: true,
      message: 'Gemini API is working!',
      response: response.substring(0, 100) + '...'
    });
  } catch (error) {
    console.error('Gemini API test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gemini API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
