# Gemini AI Integration Setup

This project now uses **Gemini AI Vision** for receipt parsing and AI features, replacing Google Cloud Vision.

## Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables

1. Copy `env.local.template` to `.env.local`
2. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Install Dependencies

The project should already have the required dependencies installed:
```bash
npm install
```

## Features

### Receipt Parsing with Gemini Vision

- **Automatic Data Extraction**: Business name, location, TIN, VAT amounts, discounts
- **Smart OCR**: Uses Gemini's advanced vision capabilities for accurate text recognition
- **Structured Output**: Returns data in consistent JSON format
- **Error Handling**: Robust error handling with fallback options

### Gemini AI Modes

1. **Simple Mode**: Basic text generation with default settings
2. **Advanced Mode**: Customizable parameters (temperature, max tokens, etc.)
3. **Chat Mode**: Conversational AI with context memory

### Available Models

- `GEMINI_PRO_VISION`: For receipt image analysis and text extraction
- `GEMINI_PRO`: Most capable model for complex tasks
- `GEMINI_FLASH`: Faster, more efficient model

## Usage

### Receipt Parsing

1. Navigate to the "Receipt OCR" tab
2. Upload or drag & drop a receipt image
3. Click "Parse receipt" - Gemini AI will analyze the image
4. View extracted data and full OCR text

### AI Features

1. Navigate to the "Gemini AI" tab
2. Choose your preferred mode
3. Enter your prompt
4. Click "Generate Response"

## API Endpoints

- `GET /api/gemini`: Get available modes and models
- `POST /api/gemini`: Generate AI responses
- `POST /api/parse`: Parse receipt images using Gemini Vision

### Example Receipt Parsing

```javascript
// Parse a receipt image
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/api/parse', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// Returns: { parsed: {...}, fullText: "..." }
```

### Example AI Usage

```javascript
// Simple text generation
const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Explain quantum computing in simple terms',
    mode: 'simple'
  })
});

// Advanced generation with custom parameters
const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Write a creative story',
    mode: 'advanced',
    options: {
      temperature: 0.9,
      maxOutputTokens: 1000
    }
  })
});

// Chat mode with conversation history
const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'What was my previous question?',
    mode: 'chat',
    options: {
      messages: [
        { role: 'user', parts: 'Hello, how are you?' },
        { role: 'model', parts: 'Hello! I\'m doing well, thank you for asking. How can I help you today?' }
      ]
    }
  })
});
```

## How It Works

### Receipt Parsing Process

1. **Image Upload**: User uploads receipt image
2. **Base64 Conversion**: Image converted to base64 for API transmission
3. **Gemini Analysis**: Gemini Vision analyzes image and extracts structured data
4. **Data Validation**: Extracted data validated and cleaned
5. **Response**: Returns both parsed data and full OCR text

### AI Features

- **Text Generation**: Create content with customizable parameters
- **Conversational AI**: Maintain context across multiple interactions
- **Streaming**: Real-time response generation
- **Safety**: Built-in content filtering

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your `GEMINI_API_KEY` is correctly set in `.env.local`
2. **Rate Limiting**: Gemini has rate limits; wait a moment between requests
3. **Model Unavailable**: Some models may not be available in all regions
4. **Image Parsing Errors**: Ensure images are clear and readable

### Getting Help

- Check the [Google AI Studio documentation](https://ai.google.dev/docs)
- Review the console for error messages
- Ensure your API key has the necessary permissions

## Benefits of Gemini AI

- **Unified Platform**: Both receipt parsing and AI features use the same API
- **Advanced Vision**: Better image understanding than traditional OCR
- **Cost Effective**: Single API key for multiple services
- **Scalable**: Handles various receipt formats and image qualities
- **Intelligent**: Context-aware parsing with better accuracy

## Future Enhancements

- **Batch Processing**: Process multiple receipts simultaneously
- **Custom Training**: Fine-tune models for specific receipt types
- **Real-time Processing**: Stream processing for live applications
- **Multi-language Support**: Parse receipts in different languages
- **Advanced Analytics**: AI-powered insights from receipt data
