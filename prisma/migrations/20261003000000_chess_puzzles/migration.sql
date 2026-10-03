CREATE TABLE "ChessPuzzle" (
    "id" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "moves" TEXT[] NOT NULL,
    "rating" INTEGER NOT NULL,
    "ratingDeviation" INTEGER NOT NULL,
    "popularity" INTEGER NOT NULL,
    "plays" INTEGER NOT NULL,
    "themes" TEXT[] NOT NULL,
    "gameUrl" TEXT NOT NULL,
    "openingTags" TEXT[] NOT NULL,
    CONSTRAINT "ChessPuzzle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChessPuzzle_rating_id_idx" ON "ChessPuzzle"("rating", "id");
