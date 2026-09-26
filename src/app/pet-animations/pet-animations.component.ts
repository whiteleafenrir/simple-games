import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translations';
import { PetMood } from '../pets/owned-pet.model';
import { petMoodKey } from '../pets/pet-display.utils';
import { PetIllustrationComponent } from '../pets/pet-illustration.component';
import { PET_OPTIONS } from '../pocket-pet/pocket-pet.config';
import { PetAppearancePickerComponent } from '../pets/pet-appearance-picker.component';
import { DEFAULT_APPEARANCE } from '../pets/pet-appearance';
import { PET_REACTIONS, PetReactionKind, PetReactionService } from '../pets/pet-reaction';

const MOOD_DESCRIPTIONS = {
  joyful: 'animationJoyfulHint',
  neutral: 'animationNeutralHint',
  angry: 'animationAngryHint',
  upset: 'animationUpsetHint',
  thoughtful: 'animationThoughtfulHint',
  irritated: 'animationIrritatedHint'
} as const satisfies Record<PetMood, TranslationKey>;

@Component({
  selector: 'app-pet-animations',
  imports: [PetIllustrationComponent, PetAppearancePickerComponent],
  providers: [PetReactionService],
  templateUrl: './pet-animations.component.html',
  styleUrl: './pet-animations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetAnimationsComponent {
  readonly i18n = inject(I18nService);
  readonly species = PET_OPTIONS;
  readonly selectedSpecies = signal(PET_OPTIONS[0]);
  readonly paused = signal(false);
  readonly appearance = signal({ ...DEFAULT_APPEARANCE });
  readonly cleanliness = signal(100);
  readonly reactions = inject(PetReactionService);
  readonly reactionDefinitions = PET_REACTIONS;
  readonly previews: readonly { kind: PetReactionKind; label: TranslationKey }[] = [
    { kind: 'joy', label: 'reactionTryPlay' }, { kind: 'content', label: 'reactionTryFeed' }, { kind: 'clean', label: 'reactionTryClean' }
  ];
  preview(kind: PetReactionKind): void {
    this.paused.set(false);
    this.reactions.play('preview', kind);
  }
  readonly moods = (Object.keys(MOOD_DESCRIPTIONS) as PetMood[]).map(mood => ({
    id: mood,
    titleKey: petMoodKey(mood),
    descriptionKey: MOOD_DESCRIPTIONS[mood]
  }));
}
