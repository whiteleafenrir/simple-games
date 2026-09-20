import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PetSceneActionId } from './owned-pet.model';

@Component({
  selector: 'app-pet-action-icon',
  template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[action()]" /></svg>',
  styles: [':host { display: inline-flex; width: 28px; height: 28px; flex-shrink: 0; } svg { width: 100%; height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetActionIconComponent {
  readonly action = input.required<PetSceneActionId>();
  readonly paths: Record<PetSceneActionId, string> = {
    feed: 'M3 12h18l-2 7H5l-2-7Zm3-4c-2-2 2-3 0-5m6 5c-2-2 2-3 0-5m6 5c-2-2 2-3 0-5',
    junkFood: 'M4 9a8 6 0 0 1 16 0H4Zm-1 4h18M4 17h16v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2ZM9 6h.01M14 6h.01',
    clean: 'M5 11h14l-2 10H7L5 11Zm3-5a2 2 0 1 0 4 0 2 2 0 1 0-4 0Zm7-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0Zm-3 13v2',
    play: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0Zm1-4c6 0 6 8 16 8M8 4c0 6 8 6 8 16',
    walk: 'M8 12c-2 0-4 4-4 6s2 3 4 3 4-1 4-3-2-6-4-6Zm7-9c-2 0-3 3-3 5s1 3 3 3 3-1 3-3-1-5-3-5Z',
    toggleLight: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
    questions: 'M20 16a3 3 0 0 1-3 3H9l-5 3v-6a7 7 0 0 1-1-4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v5M10 8a2 2 0 1 1 3 2c-1 1-1 1-1 2m0 3h.01'
  };
}
