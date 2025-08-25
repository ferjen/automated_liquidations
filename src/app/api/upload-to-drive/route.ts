import { NextRequest, NextResponse } from 'next/server';
import { uploadToGoogleDrive, generateDriveFileName } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const businessName = formData.get('businessName') as string;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const amount = formData.get('amount') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename
    const fileName = generateDriveFileName(
      businessName,
      invoiceNumber,
      amount ? parseFloat(amount) : null,
      file.name.split('.').pop() || 'jpg'
    );

    // Upload to Google Drive
    const result = await uploadToGoogleDrive(buffer, fileName, file.type);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return NextResponse.json(
      { error: 'Failed to upload to Google Drive' },
      { status: 500 }
    );
  }
}