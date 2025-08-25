import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
console.log('Gemini API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Rate limiting and retry configuration
const RATE_LIMIT_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

// ✅ Updated to Gemini 2.5 models
export const GEMINI_MODELS = {
  GEMINI_PRO: 'gemini-1.5-pro',
  GEMINI_FLASH: 'gemini-1.5-flash',
  GEMINI_PRO_VISION: 'gemini-2.5-pro', // pro handles multimodal (text + image)
} as const;

export type GeminiModel = keyof typeof GEMINI_MODELS;

/**
 * Helper function to handle rate limiting and retries
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for Gemini API call`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);

      if (error.status === 429) {
        const retryDelay = RATE_LIMIT_DELAY * attempt;
        console.log(`Rate limited, waiting ${retryDelay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      throw error;
    }
  }

  console.error(`All ${maxRetries} attempts failed. Last error:`, lastError);
  throw lastError;
}

/**
 * Generate text using Gemini AI (optionally with images)
 */
export async function generateText(
  prompt: string,
  model: GeminiModel = 'GEMINI_FLASH',
  imageData?: string
) {
  return withRetry(async () => {
    try {
      const geminiModel = genAI.getGenerativeModel(
        { model: GEMINI_MODELS[model] },
        { apiVersion: 'v1beta' }
      );

      const parts: any[] = [];
      if (imageData) {
        parts.push({ inlineData: { data: imageData, mimeType: 'image/jpeg' } });
      }
      parts.push({ text: prompt });

      const result = await geminiModel.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      throw new Error('Failed to generate text with Gemini AI');
    }
  });
}

/**
 * Generate text with streaming response
 */
export async function generateTextStream(
  prompt: string,
  model: GeminiModel = 'GEMINI_FLASH',
  onChunk?: (chunk: string) => void,
  imageData?: string
) {
  return withRetry(async () => {
    try {
      const geminiModel = genAI.getGenerativeModel(
        { model: GEMINI_MODELS[model] },
        { apiVersion: 'v1beta' }
      );

      const parts: any[] = [];
      if (imageData) {
        parts.push({ inlineData: { data: imageData, mimeType: 'image/jpeg' } });
      }
      parts.push({ text: prompt });

      const result = await geminiModel.generateContentStream(parts);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onChunk?.(chunkText);
      }

      return fullText;
    } catch (error) {
      console.error('Error generating streaming text with Gemini:', error);
      throw new Error('Failed to generate streaming text with Gemini AI');
    }
  });
}

/**
 * Generate text with safety settings and generation config
 */
export async function generateTextAdvanced(
  prompt: string,
  options: {
    model?: GeminiModel;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    imageData?: string;
  } = {}
) {
  return withRetry(async () => {
    try {
      const {
        model = 'GEMINI_FLASH',
        temperature = 0.7,
        topP = 1,
        topK = 1,
        maxOutputTokens = 2048,
        imageData,
      } = options;

      const geminiModel = genAI.getGenerativeModel(
        { model: GEMINI_MODELS[model] },
        { apiVersion: 'v1beta' }
      );

      const parts: any[] = [];
      if (imageData) {
        parts.push({ inlineData: { data: imageData, mimeType: 'image/jpeg' } });
      }
      parts.push({ text: prompt });

      const result = await geminiModel.generateContent({
        contents: parts,
        generationConfig: { temperature, topP, topK, maxOutputTokens },
      } as any);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating advanced text with Gemini:', error);
      throw new Error('Failed to generate advanced text with Gemini AI');
    }
  });
}

/**
 * Chat with Gemini AI (maintains conversation context, optional images)
 */
export async function chatWithGemini(
  messages: Array<{ role: 'user' | 'model'; parts: string; imageData?: string }>,
  model: GeminiModel = 'GEMINI_PRO'
) {
  return withRetry(async () => {
    try {
      const geminiModel = genAI.getGenerativeModel(
        { model: GEMINI_MODELS[model] },
        { apiVersion: 'v1beta' }
      );

      const chat = geminiModel.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role,
          parts: [
            ...(msg.imageData ? [{ inlineData: { data: msg.imageData, mimeType: 'image/jpeg' } }] : []),
            { text: msg.parts },
          ],
        })),
      });

      const lastMsg = messages[messages.length - 1];
      const result = await chat.sendMessage([
        ...(lastMsg.imageData ? [{ inlineData: { data: lastMsg.imageData, mimeType: 'image/jpeg' } }] : []),
        { text: lastMsg.parts },
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error chatting with Gemini:', error);
      throw new Error('Failed to chat with Gemini AI');
    }
  });
}

/**
 * Analyze receipt image and extract structured data using Gemini Vision
 */
export async function analyzeReceiptImage(
  imageData: string,
  model: GeminiModel = 'GEMINI_FLASH'
) {
  return withRetry(async () => {
    try {
      const geminiModel = genAI.getGenerativeModel(
        { model: GEMINI_MODELS[model] },
        // { apiVersion: 'v1beta' }
      );

      const prompt = `extract all information from the image, 
      including business details, VAT, discounts, best by/expiry date, and 
      any other relevant fields. 
      Return the result strictly in JSON format:
      {
        "businessName": "...",
        "location": "...",
        "tin": "...",
        "vat": number|null,
        "vatExcl": number|null,
        "vatIncl": number|null,
        "pwdDiscountLabel": "...",
        "pwdDiscountAmount": number|null,
        "bestByDate": "YYYY-MM-DD" | null,
        "totalAmountDue": "number"|null
      }`;

      const imagePart = { inlineData: { data: imageData, mimeType: 'image/jpeg' } };

      const result = await geminiModel.generateContent([imagePart, { text: prompt }]);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in response');

      const parsedData = JSON.parse(jsonMatch[0]);
      return {
        businessName: parsedData.businessName || null,
        location: parsedData.location || null,
        tin: parsedData.tin || null,
        vat: typeof parsedData.vat === 'number' ? parsedData.vat : null,
        vatExcl: typeof parsedData.vatExcl === 'number' ? parsedData.vatExcl : null,
        vatIncl: typeof parsedData.vatIncl === 'number' ? parsedData.vatIncl : null,
        pwdDiscountLabel: parsedData.pwdDiscountLabel || null,
        pwdDiscountAmount: typeof parsedData.pwdDiscountAmount === 'number' ? parsedData.pwdDiscountAmount : null,
        totalAmountDue: typeof parsedData.totalAmountDue === 'number' ? parsedData.totalAmountDue : null,
        bestByDate: parsedData.bestByDate || null,
      };
    } catch (error) {
      console.error('Error analyzing receipt image with Gemini:', error);
      throw new Error('Failed to analyze receipt image with Gemini AI');
    }
  });
}

/**
 * Get full OCR text from receipt image using Gemini Vision
 */
export async function getReceiptText(
  imageData: string,
  model: GeminiModel = 'GEMINI_FLASH'
) {
  return withRetry(async () => {
    try {
      const geminiModel = genAI.getGenerativeModel(
        { model: GEMINI_MODELS[model] },
        { apiVersion: 'v1beta' }
      );

      const prompt = `Extract and return the full raw text from this receipt image.
      Do not summarize, interpret, or reformat the content. Preserve line breaks 
      and formatting exactly as they appear.`;

      const imagePart = { inlineData: { data: imageData, mimeType: 'image/jpeg' } };

      const result = await geminiModel.generateContent([imagePart, { text: prompt }]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error extracting text from receipt image with Gemini:', error);
      throw new Error('Failed to extract text from receipt image with Gemini AI');
    }
  });
}
