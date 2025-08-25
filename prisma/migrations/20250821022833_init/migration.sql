-- CreateTable
CREATE TABLE "public"."receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "business_name" TEXT,
    "location" TEXT,
    "tin" TEXT,
    "vat" DECIMAL(10,2),
    "vat_excl" DECIMAL(10,2),
    "vat_incl" DECIMAL(10,2),
    "pwd_discount_label" TEXT,
    "pwd_discount_amount" DECIMAL(10,2),

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);
