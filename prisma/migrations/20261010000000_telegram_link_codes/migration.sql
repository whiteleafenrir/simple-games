-- CreateTable
CREATE TABLE "TelegramLinkCode" (
    "guestSessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramLinkCode_pkey" PRIMARY KEY ("guestSessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkCode_tokenHash_key" ON "TelegramLinkCode"("tokenHash");

-- AddForeignKey
ALTER TABLE "TelegramLinkCode" ADD CONSTRAINT "TelegramLinkCode_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
