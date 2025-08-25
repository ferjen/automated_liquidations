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
    const metadataRaw = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!metadataRaw) {
      return NextResponse.json({ error: "No metadata provided" }, { status: 400 });
    }

    let metadata: any = {};
    try {
      metadata = JSON.parse(metadataRaw);
    } catch {
      return NextResponse.json({ error: "Invalid metadata JSON" }, { status: 400 });
    }

    const businessName = metadata.businessName ?? null;
    const invoiceNumber = metadata.invoiceNumber ?? null;
    const amount = metadata.totalAmountDue ?? null;
    const dateIssued = metadata.dateIssued ?? null;

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

    // Convert file to buffer using streaming
    const chunks: Uint8Array[] = [];
    const reader = file.stream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const arrayBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const buffer = Buffer.from(arrayBuffer);

    // Generate filename
    const fileName = generateDriveFileName(
      businessName,
      invoiceNumber,
      amount ? parseFloat(amount) : null,
      file.name.split(".").pop() || "jpg"
    );

    console.log("Generated filename:", fileName);

    // Upload to Google Drive
    const result = await uploadToGoogleDrive(buffer, fileName, file.type);

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
    });
  } catch (error: any) {
    console.error("Error uploading to Google Drive:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload to Google Drive" },
      { status: 500 }
    );
  }
}
