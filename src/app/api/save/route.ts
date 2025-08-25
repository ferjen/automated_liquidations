import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { record } = body as { record: Record<string, unknown> };
		if (!record) return NextResponse.json({ error: "Missing record" }, { status: 400 });
		await prisma.receipt.create({
			data: {
				businessName: (record["business_name"] as string) ?? null,
				location: (record["location"] as string) ?? null,
				tin: (record["tin"] as string) ?? null,
				vat: record["vat"] != null ? new Prisma.Decimal(String(record["vat"])) : null,
				vatExcl: record["vat_excl"] != null ? new Prisma.Decimal(String(record["vat_excl"])) : null,
				vatIncl: record["vat_incl"] != null ? new Prisma.Decimal(String(record["vat_incl"])) : null,
				pwdDiscountLabel: (record["pwd_discount_label"] as string) ?? null,
				pwdDiscountAmount:
					record["pwd_discount_amount"] != null
						? new Prisma.Decimal(String(record["pwd_discount_amount"]))
						: null,
			},
		});
		return NextResponse.json({ ok: true });
	} catch (err: unknown) {
		console.error(err);
		return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
	}
}


