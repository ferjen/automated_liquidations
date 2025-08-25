export type ParsedReceipt = {
	businessName: string | null;
  location: string | null;
  tin: string | null;
  invoiceNumber: string | null; // Add this line
  vat: number | null;
  vatExcl: number | null;
  vatIncl: number | null;
  pwdDiscountLabel: string | null;
  pwdDiscountAmount: number | null;
  totalAmountDue: number | null;
  bestByDate: string | null;
};

function extractNumber(text: string): number | null {
	const normalized = text.replace(/[,\s]/g, "");
	const match = normalized.match(/(-?\d+(?:\.\d+)?)/);
	return match ? Number(match[1]) : null;
}

function findLine(lines: string[], ...keywords: string[]): string | null {
	const lowerKeywords = keywords.map((k) => k.toLowerCase());
	for (const line of lines) {
		const l = line.toLowerCase();
		if (lowerKeywords.every((k) => l.includes(k))) return line;
	}
	return null;
}

export function parseReceiptText(fullText: string): ParsedReceipt {
	const lines = fullText
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	// Business name heuristic: first non-empty, non-numeric-dominated line
	let businessName: string | null = null;
	for (const line of lines) {
		const letters = line.replace(/[^A-Za-z]/g, "");
		if (letters.length >= 3) {
			businessName = line;
			break;
		}
	}

	// Location: look for keywords like "Street", "St.", "Ave", "Road", or lines with commas after the top lines
	let location: string | null = null;
	for (let i = 1; i < Math.min(lines.length, 8); i++) {
		const l = lines[i];
		if (/[0-9].*,.*|\b(st\.?|street|ave|avenue|rd\.?|road|blvd\.?|city|province|state|zip)\b/i.test(l)) {
			location = l;
			break;
		}
	}

	// TIN
	let tin: string | null = null;
	const tinLine = lines.find((l) => /\bTIN\b|Tax\s*ID|VAT\s*Reg(istration)?/i.test(l));
	if (tinLine) {
		const m = tinLine.match(/(TIN|Tax\s*ID)[:\s-]*([A-Za-z0-9-]+)/i);
		if (m) tin = m[2];
	}

	// Invoice Number
	let invoiceNumber: string | null = null;
	const invoiceLine = lines.find((l) => /\binvoice\s*no\.?|invoice\s*number/i.test(l));
	if (invoiceLine) {
		const m = invoiceLine.match(/(?:invoice\s*no\.?|invoice\s*number)[:\s-]*([A-Za-z0-9-]+)/i);
		if (m) invoiceNumber = m[1];
	}

	// VAT amounts
	let vat: number | null = null;
	let vatExcl: number | null = null;
	let vatIncl: number | null = null;

	const vatLine = findLine(lines, "vat");
	if (vatLine) vat = extractNumber(vatLine);

	const subtotalLine = lines.find((l) => /subtotal|vat\s*excl\.?|exclusive\s*vat/i.test(l));
	if (subtotalLine) vatExcl = extractNumber(subtotalLine);

	const totalLine = lines.find((l) => /total|amount\s*due|vat\s*incl\.?|inclusive\s*vat/i.test(l));
	if (totalLine) vatIncl = extractNumber(totalLine);

	// PWD Discount (Persons with Disability)
	let pwdDiscountLabel: string | null = null;
	let pwdDiscountAmount: number | null = null;
	const pwdLine = lines.find((l) => /pwd\s*discount|senior\s*discount|discount/i.test(l));
	if (pwdLine) {
		pwdDiscountLabel = pwdLine;
		pwdDiscountAmount = extractNumber(pwdLine);
	}

	return {
		businessName,
		location,
		invoiceNumber,
		tin,
		vat,
		vatExcl,
		vatIncl,
		pwdDiscountLabel,
		pwdDiscountAmount,
		totalAmountDue: null, // Add default value or logic to extract this
		bestByDate: null, // Add default value or logic to extract this
	};
}


