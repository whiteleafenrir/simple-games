import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PetId, PetMood } from './owned-pet.model';

@Component({
  selector: 'app-pet-illustration',
  templateUrl: './pet-illustration.component.html',
  styleUrl: './pet-illustration.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.sleeping]': 'sleeping()', '[class.dog]': 'species() === "dog"', '[class.parrot]': 'species() === "parrot"', '[class.dinosaur]': 'species() === "dinosaur"' }
})
export class PetIllustrationComponent {
  readonly species = input.required<PetId>();
  readonly mood = input.required<PetMood>();
  readonly sleeping = input(false);
}
