import { NextRequest, NextResponse } from 'next/server';
import { analyzeReceiptImage, getReceiptText } from '@/lib/gemini';

// Configure the route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    console.log('Parse API called');
    
    // Parse the form data with streaming to handle large files
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (allow up to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 413 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Convert file to base64 in chunks to avoid memory issues
    const chunks: Uint8Array[] = [];
    const reader = file.stream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const arrayBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Image converted to base64, length:', base64.length);

    // Validate base64 conversion
    if (!base64 || base64.length === 0) {
      console.error('Failed to convert image to base64');
      return NextResponse.json({ error: 'Failed to process image' }, { status: 400 });
    }

    console.log('Calling Gemini API...');
    
    try {
      // Call Gemini APIs with individual error handling
      const [parsedData, fullText] = await Promise.allSettled([
        analyzeReceiptImage(base64),
        getReceiptText(base64)
      ]);

      // Handle parsed data result
      let finalParsedData;
      if (parsedData.status === 'fulfilled') {
        finalParsedData = parsedData.value;
      } else {
        console.error('Failed to analyze receipt:', parsedData.reason);
        finalParsedData = {
          businessName: null,
          location: null,
          tin: null,
          vat: null,
          vatExcl: null,
          vatIncl: null,
          pwdDiscountLabel: null,
          pwdDiscountAmount: null,
          totalAmountDue: null,
          invoiceNumber: null
        };
      }

      // Handle full text result
      let finalFullText;
      if (fullText.status === 'fulfilled') {
        finalFullText = fullText.value;
      } else {
        console.error('Failed to extract text:', fullText.reason);
        finalFullText = 'Unable to extract text from image';
      }

      console.log('Gemini API calls completed');
      return NextResponse.json({
        parsed: finalParsedData,
        fullText: finalFullText
      });

    } catch (geminiError: any) {
      console.error('Gemini API error:', {
        message: geminiError.message,
        status: geminiError.status,
        errorDetails: geminiError.errorDetails
      });

      // Handle specific Gemini API errors
      if (geminiError.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      } else if (geminiError.status === 403) {
        return NextResponse.json(
          { error: 'API access denied. Please check your Gemini API key.' },
          { status: 403 }
        );
      } else if (geminiError.status === 400) {
        return NextResponse.json(
          { error: 'Invalid request. Please try with a different image.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to process image with AI' },
          { status: 500 }
        );
      }
    }

  } catch (error: any) {
    console.error('Parse API error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}


