"use client";
import { useMemo, useRef, useState } from "react";
import GeminiTest from "@/components/GeminiTest";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/enhanced-card";
import { Upload, FileText, Download, Trash2, Eye, EyeOff, Sparkles, Receipt, Brain, ExternalLink } from "lucide-react";

type Parsed = {
  businessName: string | null;
  location: string | null;
  tin: string | null;
  vat: number | null;
  vatExcl: number | null;
  vatIncl: number | null;
  pwdDiscountLabel: string | null;
  pwdDiscountAmount: number | null;
  totalAmountDue: number | null;
  invoiceNumber: string | null; // Add this for filename generation
  driveFileId?: string | null;
  driveFileName?: string | null;
  driveWebViewLink?: string | null;
  driveWebContentLink?: string | null;
  driveLink?: string | null; // Added driveLink property
};

type Tab = 'receipts' | 'gemini';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('receipts');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<{
    parsed: Parsed;
    fullText: string;
    imageUrl: string | null;
    expanded?: boolean;
    driveLink?: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState<number | null>(null);
  const [autoUploadSuccess, setAutoUploadSuccess] = useState<string | null>(null);

  function handleFilePicked(f: File | null) {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  }

  async function handleParse() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setRateLimited(false);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      
      if (!res.ok) {
        if (res.status === 429) {
          setRateLimited(true);
          setError("Rate limit reached. Please wait a moment and try again.");
        } else {
          throw new Error("Failed to parse");
        }
        return;
      }
      
      const data = (await res.json()) as { parsed: Parsed; fullText: string };
      
      // Add the parsed row first
      const newRowIndex = rows.length;
      const newRow = { 
        parsed: data.parsed, 
        fullText: data.fullText, 
        imageUrl: previewUrl ?? null, 
        expanded: false 
      };
      
      setRows((prev) => [...prev, newRow]);
      
      // Automatically upload to Google Drive after successful parsing
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('businessName', data.parsed.businessName || '');
        formData.append('invoiceNumber', data.parsed.invoiceNumber || '');
        formData.append('amount', data.parsed.totalAmountDue?.toString() || '');
        formData.append('dateIssued', new Date().toISOString().split('T')[0]);

        setUploadingToDrive(newRowIndex);
        
        const driveRes = await fetch('/api/upload-to-drive', {
          method: 'POST',
          body: formData,
        });

        if (driveRes.ok) {
          const driveResult = await driveRes.json();
          console.log('Auto-upload to Drive successful:', driveResult);
          
          // Show success message
          setAutoUploadSuccess(`Successfully uploaded as: ${driveResult.fileName}`);
          setTimeout(() => setAutoUploadSuccess(null), 5000); // Clear after 5 seconds
          
          // Update the row with Google Drive info
          setRows(prev => prev.map((r, i) => 
            i === newRowIndex 
              ? {
                  ...r,
                  parsed: {
                    ...r.parsed,
                    driveFileId: driveResult.fileId,
                    driveFileName: driveResult.fileName,
                    driveWebViewLink: driveResult.webViewLink,
                    driveWebContentLink: driveResult.webContentLink,
                    driveLink: driveResult.webViewLink,
                  },
                  driveLink: driveResult.webViewLink
                }
              : r
          ));
        } else {
          const driveError = await driveRes.json();
          console.warn('Auto-upload to Drive failed:', driveError.error);
          // Don't show error to user for auto-upload failure, just log it
        }
      } catch (driveError) {
        console.warn('Auto-upload to Drive failed:', driveError);
        // Don't show error to user for auto-upload failure, just log it
      } finally {
        setUploadingToDrive(null);
      }
      
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadToDrive(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row.imageUrl) return;

    setUploadingToDrive(rowIndex);
    
    try {
      // Convert blob URL back to file
      const response = await fetch(row.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `receipt_${rowIndex}.jpg`, { type: blob.type });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessName', row.parsed.businessName || '');
      formData.append('invoiceNumber', row.parsed.invoiceNumber || '');
      formData.append('amount', row.parsed.totalAmountDue?.toString() || '');
      formData.append('dateIssued', new Date().toISOString().split('T')[0]);

      const res = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload to Google Drive');
      }

      const result = await res.json();
      console.log('Upload result:', result); // Debug log

      // Update the row with Google Drive info
      setRows(prev => prev.map((r, i) => 
        i === rowIndex 
          ? {
              ...r,
              parsed: {
                ...r.parsed,
                driveFileId: result.fileId,
                driveFileName: result.fileName,
                driveWebViewLink: result.webViewLink,
                driveWebContentLink: result.webContentLink,
                driveLink: result.webViewLink, // Add this for backward compatibility
              },
              driveLink: result.webViewLink // Also add at row level
            }
          : r
      ));

      console.log('Successfully uploaded to Google Drive:', result.fileName);

    } catch (error: any) {
      console.error('Drive upload error:', error);
      setError(error.message || 'Failed to upload to Google Drive');
    } finally {
      setUploadingToDrive(null);
    }
  }

  async function handleSave(row: Parsed) {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record: {
          business_name: row.businessName,
          location: row.location,
          tin: row.tin,
          vat: row.vat,
          vat_excl: row.vatExcl,
          vat_incl: row.vatIncl,
          pwd_discount_label: row.pwdDiscountLabel,
          pwd_discount_amount: row.pwdDiscountAmount,
          total_amount_due: row.totalAmountDue,
          invoice_number: row.invoiceNumber,
          drive_file_id: row.driveFileId,
          drive_file_name: row.driveFileName,
          drive_web_view_link: row.driveWebViewLink,
          drive_web_content_link: row.driveWebContentLink,
          drive_link: row.driveWebViewLink || row.driveLink,
        },
      }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      alert(`Failed to save to Supabase: ${errorData.error || 'Unknown error'}`);
    } else {
      alert('Successfully saved to database!');
    }
  }

  const csv = useMemo(() => {
    const headers = [
      "Business Name",
      "Location",
      "TIN",
      "Invoice Number",
      "VAT",
      "VAT Excl",
      "VAT Incl",
      "PWD Discount",
      "PWD Discount Amount",
      "Total Amount Due",
      "Google Drive Link",
      "Drive File Name",
    ];
    const rowsCsv = rows.map((r) =>
      [
        r.parsed.businessName ?? "",
        r.parsed.location ?? "",
        r.parsed.tin ?? "",
        r.parsed.invoiceNumber ?? "",
        r.parsed.vat ?? "",
        r.parsed.vatExcl ?? "",
        r.parsed.vatIncl ?? "",
        r.parsed.pwdDiscountLabel ?? "",
        r.parsed.pwdDiscountAmount ?? "",
        r.parsed.totalAmountDue ?? "",
        (r.parsed.driveWebViewLink || r.driveLink) ?? "",
        r.parsed.driveFileName ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    return [headers.join(","), ...rowsCsv].join("\n");
  }, [rows]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receipts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const ReceiptOCR = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-400 to-indigo-600 rounded-2xl text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered OCR</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Extract Receipt Data with{" "}
              <span className="text-white/90">Gemini AI</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Upload receipt images and instantly extract structured data including business information, taxes, and discounts using advanced AI vision technology.
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border-white/20"
            >
              <Upload className="w-5 h-5" />
              Start Scanning Receipts
            </Button>
          </div>
          <div className="relative">
            <div className="w-full h-64 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center">
              <Receipt className="w-16 h-16 text-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="overflow-hidden border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Receipt className="w-6 h-6 text-blue-600" />
            Upload Receipt
          </CardTitle>
          <CardDescription>
            Drag and drop or browse to select a receipt image for AI processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFilePicked(f);
            }}
            className={`relative border-2 border-dashed rounded-xl p-8 grid gap-4 place-items-center min-h-40 text-center transition-all duration-300 ${
              dragActive 
                ? "border-blue-500 bg-blue-50 shadow-lg" 
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 w-auto object-contain rounded-lg shadow-md border"
                />
                <p className="text-sm text-gray-600">Ready to process</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-600 via-blue-400  flex items-center justify-center text-white shadow-lg">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Drop receipt image here</p>
                  <p className="text-sm text-gray-500">or click to browse files</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Browse Files
                </Button>
                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                  <Brain className="w-4 h-4" />
                  <span>Powered by Google Gemini AI</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleParse}
              disabled={!file || loading}
              className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {rateLimited ? "Retrying..." : "Processing..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Parse Receipt
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                handleFilePicked(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              variant="outline"
              size="lg"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </CardContent>
            </Card>
          )}

          {rateLimited && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <div className="w-4 h-4 border-2 border-yellow-600/30 border-t-yellow-600 rounded-full animate-spin" />
                  <p className="text-sm font-medium">
                    Rate limit reached. Automatically retrying...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {autoUploadSuccess && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <ExternalLink className="w-4 h-4" />
                  <p className="text-sm font-medium">{autoUploadSuccess}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {rows.length > 0 && (
        <Card className="overflow-hidden border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Extracted Data</CardTitle>
                <CardDescription>
                  {rows.length} receipt{rows.length !== 1 ? 's' : ''} processed
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setRows([])}
                  variant="outline"
                  disabled={rows.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
                <Button
                  onClick={downloadCsv}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  disabled={rows.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-left font-medium">Business</th>
                    <th className="py-3 px-4 text-left font-medium">Location</th>
                    <th className="py-3 px-4 text-left font-medium">TIN</th>
                    <th className="py-3 px-4 text-left font-medium">Invoice #</th>
                    <th className="py-3 px-4 text-left font-medium">VAT</th>
                    <th className="py-3 px-4 text-left font-medium">VAT Excl</th>
                    <th className="py-3 px-4 text-left font-medium">VAT Incl</th>
                    <th className="py-3 px-4 text-left font-medium">PWD Discount</th>
                    <th className="py-3 px-4 text-left font-medium">Discount Amount</th>
                    <th className="py-3 px-4 text-left font-medium">Total Due</th>
                    <th className="py-3 px-4 text-left font-medium">Drive Link</th>
                    <th className="py-3 px-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <>
                      <tr key={`row-${i}`} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium">{r.parsed.businessName || '-'}</td>
                        <td className="py-3 px-4">{r.parsed.location || '-'}</td>
                        <td className="py-3 px-4 font-mono text-xs">{r.parsed.tin || '-'}</td>
                        <td className="py-3 px-4 font-mono text-xs">{r.parsed.invoiceNumber || '-'}</td>
                        <td className="py-3 px-4">{r.parsed.vat || '-'}</td>
                        <td className="py-3 px-4">{r.parsed.vatExcl || '-'}</td>
                        <td className="py-3 px-4 font-medium">{r.parsed.vatIncl || '-'}</td>
                        <td className="py-3 px-4">{r.parsed.pwdDiscountLabel || '-'}</td>
                        <td className="py-3 px-4">{r.parsed.pwdDiscountAmount || '-'}</td>
                        <td className="py-3 px-4 font-bold text-green-600">{r.parsed.totalAmountDue || '-'}</td>
                        <td className="py-3 px-4">
                          {r.parsed.driveWebViewLink || r.driveLink ? (
                            <div className="flex flex-col gap-1">
                              <a
                                href={r.parsed.driveWebViewLink || r.driveLink || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View in Drive
                              </a>
                              {r.parsed.driveFileName && (
                                <span className="text-xs text-gray-500 truncate max-w-24" title={r.parsed.driveFileName}>
                                  {r.parsed.driveFileName}
                                </span>
                              )}
                            </div>
                          ) : uploadingToDrive === i ? (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                              <span>Uploading...</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not uploaded</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUploadToDrive(i)}
                              disabled={uploadingToDrive === i || !r.imageUrl || !!(r.parsed.driveWebViewLink || r.driveLink)}
                              variant="outline"
                              size="sm"
                              title={
                                (r.parsed.driveWebViewLink || r.driveLink) 
                                  ? "Already uploaded to Drive" 
                                  : "Upload to Google Drive"
                              }
                            >
                              {uploadingToDrive === i ? (
                                <div className="w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                              ) : (r.parsed.driveWebViewLink || r.driveLink) ? (
                                <ExternalLink className="w-3 h-3 text-green-600" />
                              ) : (
                                <Upload className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              onClick={() => handleSave(r.parsed)}
                              variant="outline"
                              size="sm"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() =>
                                setRows((prev) => prev.map((row, idx) => 
                                  idx === i ? { ...row, expanded: !row.expanded } : row
                                ))
                              }
                              variant="ghost"
                              size="sm"
                            >
                              {r.expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {r.expanded && (
                        <tr key={`exp-${i}`} className="border-b bg-gray-25">
                          <td className="p-4" colSpan={12}>
                            <Card className="bg-white/50">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">OCR Raw Text</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <pre className="whitespace-pre-wrap text-xs font-mono max-h-48 overflow-auto p-3 rounded bg-gray-50 border">
                                  {r.fullText}
                                </pre>
                              </CardContent>
                            </Card>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                R
              </div>
              <div>
                <h1 className="text-xl font-bold">Receipt Vision</h1>
                <p className="text-xs text-gray-500">AI-Powered OCR Technology</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <Card className="mb-8 overflow-hidden border-2">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 relative ${
                activeTab === 'receipts'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Receipt OCR
            </button>
            <button
              onClick={() => setActiveTab('gemini')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 relative ${
                activeTab === 'gemini'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Brain className="w-4 h-4" />
              Gemini AI
            </button>
          </div>
        </Card>

        {/* Tab Content */}
        {activeTab === 'receipts' ? <ReceiptOCR /> : <GeminiTest />}
      </main>
    </div>
  );
}
