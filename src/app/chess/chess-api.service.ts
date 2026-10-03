import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import type { ChessDifficulty, ChessPuzzleResponse } from '@simple-games/pet-contract';

@Injectable({ providedIn: 'root' })
export class ChessApiService {
  private readonly http = inject(HttpClient);

  random(difficulty: ChessDifficulty, previousId?: string): Promise<ChessPuzzleResponse> {
    return firstValueFrom(
      this.http
        .get<ChessPuzzleResponse>('/api/chess/puzzles/random', {
          params: { difficulty, ...(previousId ? { previousId } : {}) }
        })
        .pipe(timeout(20_000))
    );
  }
}
