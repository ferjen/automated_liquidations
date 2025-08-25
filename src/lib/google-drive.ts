import { google } from 'googleapis';
import { Readable } from 'stream';

// Initialize Google Drive API
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  'http://localhost:3000' // redirect URI (not used for refresh token flow)
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
}

/**
 * Upload image to Google Drive
 */
export async function uploadToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // Convert buffer to readable stream
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file to Google Drive');
    }

    // Make file publicly viewable (optional)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: response.data.id,
      fileName: response.data.name || fileName,
      webViewLink: response.data.webViewLink || '',
      webContentLink: response.data.webContentLink || '',
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error('Failed to upload to Google Drive');
  }
}

/**
 * Generate filename with format: "YYYY-MM-DD_CompanyName_InvoiceNumber_Amount"
 */
export function generateDriveFileName(
  businessName: string | null,
  invoiceNumber: string | null,
  amount: number | null,
  extension: string = 'jpg'
): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const company = (businessName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const invoice = (invoiceNumber || 'NoInvoice').replace(/[^a-zA-Z0-9]/g, '_');
  const amountStr = amount ? amount.toFixed(2).replace('.', '_') : '0_00';
  
  return `${date}_${company}_${invoice}_${amountStr}.${extension}`;
}

/**
 * Delete file from Google Drive
 */
export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({
      fileId,
    });
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw new Error('Failed to delete from Google Drive');
  }
}