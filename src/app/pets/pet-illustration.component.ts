import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PetAppearance, PetId, PetMood } from './owned-pet.model';
import { DEFAULT_APPEARANCE } from './pet-appearance';
import { PetReactionKind } from './pet-reaction';
import { PetSvgComponent } from './pet-svg.component';
import { PetCat3dComponent } from './pet-cat-3d.component';
import { PetPose, PetRenderer, PetVisualState } from './pet-visual-state';

@Component({
  selector: 'app-pet-illustration',
  imports: [NgTemplateOutlet, PetSvgComponent, PetCat3dComponent],
  template: `
    <ng-template #flat>
      <app-pet-svg
        [species]="species()"
        [mood]="mood()"
        [appearance]="appearance()"
        [cleanliness]="cleanliness()"
        [sleeping]="sleeping()"
        [animated]="animated()"
        [paused]="paused()"
        [calmJoy]="calmJoy()"
        [reaction]="reaction()"
        [interaction]="interaction()"
      />
    </ng-template>
    @if (use3d() && !failed()) {
      @defer (on viewport) {
        <app-pet-cat-3d [state]="state()" (unavailable)="failed.set(true)" />
      } @placeholder {
        <div><ng-container [ngTemplateOutlet]="flat" /></div>
      } @error {
        <ng-container [ngTemplateOutlet]="flat" />
      }
    } @else {
      <ng-container [ngTemplateOutlet]="flat" />
    }
  `,
  styles: `
    :host {
      display: block;
      width: min(100%, 300px);
    }
    app-pet-svg {
      width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetIllustrationComponent {
  readonly species = input.required<PetId>();
  readonly mood = input.required<PetMood>();
  readonly appearance = input<PetAppearance>(DEFAULT_APPEARANCE);
  readonly cleanliness = input(100);
  readonly sleeping = input(false);
  readonly animated = input(false);
  readonly paused = input(false);
  readonly calmJoy = input(false);
  readonly reaction = input<PetReactionKind | null>(null);
  readonly interaction = input<'petting' | null>(null);
  readonly renderer = input<PetRenderer>('auto');
  readonly pose = input<PetPose>('default');
  readonly yaw = input(-25);
  readonly failed = signal(false);
  // Small static portraits retain SVG and do not allocate WebGL contexts.
  readonly use3d = computed(
    () => this.species() === 'cat' && this.renderer() !== 'svg' && (this.animated() || this.renderer() === '3d')
  );
  readonly state = computed<PetVisualState>(() => ({
    mood: this.mood(),
    appearance: this.appearance(),
    cleanliness: this.cleanliness(),
    sleeping: this.sleeping(),
    animated: this.animated(),
    paused: this.paused(),
    calmJoy: this.calmJoy(),
    reaction: this.reaction(),
    interaction: this.interaction(),
    pose: this.pose(),
    yaw: this.yaw()
  }));
}
