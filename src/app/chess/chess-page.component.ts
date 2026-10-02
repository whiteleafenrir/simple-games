import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { ChessPuzzleComponent } from './chess-puzzle.component';

@Component({
  selector: 'app-chess-page',
  imports: [RouterLink, ChessPuzzleComponent],
  template: `
    <header>
      <a routerLink="/">← {{ i18n.t('chessBackHome') }}</a>
      <h1>{{ i18n.t('chessTitle') }}</h1>
      <p>{{ i18n.t('chessIntro') }}</p>
    </header>
    <app-chess-puzzle />
  `,
  styles: `
    :host {
      display: block;
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 28px;
    }
    a {
      color: var(--primary);
      font-size: 0.85rem;
      text-decoration: none;
    }
    h1 {
      margin: 22px 0 12px;
      font-family: var(--display-font);
      font-size: clamp(2rem, 4vw, 3.2rem);
      font-weight: 500;
      letter-spacing: -0.04em;
    }
    p {
      max-width: 650px;
      margin: 0;
      color: var(--muted-text);
      line-height: 1.8;
      font-size: 0.92rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChessPageComponent {
  readonly i18n = inject(I18nService);
}
