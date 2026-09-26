import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PetAppearance, PetId, PetMood } from './owned-pet.model';
import { COAT_COLORS, DEFAULT_APPEARANCE, dirtOpacity } from './pet-appearance';
import { PET_REACTIONS, PetReactionKind } from './pet-reaction';
import { PetSurfaceComponent } from './pet-surface.component';

let illustrationId = 0;

@Component({
  selector: 'app-pet-illustration',
  imports: [PetSurfaceComponent],
  templateUrl: './pet-illustration.component.html',
  styleUrl: './pet-illustration.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.animated]': 'animated()',
    '[class.paused]': 'paused()',
    '[attr.data-motion]': 'motion()',
    '[attr.data-reaction]': 'sleeping() ? null : reaction()',
    '[style.--coat]': 'palette()?.swatch ?? null',
    '[style.--accent]': 'palette()?.accent ?? null',
    '[style.--outline]': 'palette()?.outline ?? null',
    '[class.dragon]': 'species() === "dragon"',
    '[class.dog]': 'species() === "dog"',
    '[class.parrot]': 'species() === "parrot"',
    '[class.dinosaur]': 'species() === "dinosaur"'
  }
})
export class PetIllustrationComponent {
  readonly bodyId = 'pet-body-' + ++illustrationId;
  readonly headId = 'pet-head-' + illustrationId;
  readonly appearance = input<PetAppearance>(DEFAULT_APPEARANCE);
  readonly cleanliness = input(100);
  readonly calmJoy = input(false);
  readonly reaction = input<PetReactionKind | null>(null);
  readonly palette = computed(() => this.appearance().color === 'natural' ? null : COAT_COLORS.find(color => color.id === this.appearance().color));
  readonly dirt = computed(() => dirtOpacity(this.cleanliness()));
  readonly expression = computed(() => {
    const reaction = this.reaction();
    return reaction ? PET_REACTIONS[reaction].mood : this.mood();
  });
  readonly motion = computed(() => {
    if (this.sleeping()) return 'sleeping';
    if (this.beingPetted()) return 'petting';
    if (this.reaction() === 'content') return 'content';
    return !this.reaction() && this.calmJoy() && this.mood() === 'joyful' ? 'neutral' : this.expression();
  });
  readonly species = input.required<PetId>();
  readonly mood = input.required<PetMood>();
  readonly sleeping = input(false);
  readonly animated = input(false);
  readonly paused = input(false);
  readonly interaction = input<'petting' | null>(null);
  readonly beingPetted = computed(() => !this.sleeping() && this.interaction() === 'petting');
}
