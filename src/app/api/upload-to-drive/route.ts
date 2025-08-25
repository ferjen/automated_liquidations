import { NextRequest, NextResponse } from "next/server";
import { uploadToGoogleDrive, generateDriveFileName } from "@/lib/google-drive";

// Configure the route
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout

export async function POST(req: NextRequest) {
  try {
    console.log("Drive upload API called");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const businessName = formData.get("businessName") as string;
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const amount = formData.get("amount") as string;
    const dateIssued = formData.get("dateIssued") as string;

    console.log("Received data:", {
      fileName: file?.name,
      fileSize: file?.size,
      businessName,
      invoiceNumber,
      amount,
      dateIssued,
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (allow up to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 413 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    console.log("Processing file:", file.name, file.type, file.size);

    // Convert file to buffer using streaming for large files
    const chunks: Uint8Array[] = [];
    const reader = file.stream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const arrayBuffer = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const buffer = Buffer.from(arrayBuffer);

    // Generate filename
    const fileName = generateDriveFileName(
      dateIssued,
      businessName,
      invoiceNumber,
      amount ? parseFloat(amount) : null,
      file.name.split(".").pop() || "jpg"
    );

    console.log("Generated filename:", fileName);

    // Upload to Google Drive
    const result = await uploadToGoogleDrive(buffer, fileName, file.type);

    console.log("Upload successful:", result);

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      driveLink: result.webViewLink, // Add for backward compatibility
    });
  } catch (error: any) {
    console.error("Error uploading to Google Drive:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to upload to Google Drive",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
