import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PetCoatPattern } from './owned-pet.model';

/** Markings stay inside the common interior of every species silhouette. */
@Component({
  selector: 'g[petSurface]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg:g class="markings">
      @if (pattern() === 'spots') {
        @if (head()) {
          <svg:ellipse cx="92" cy="79" rx="10" ry="7"/><svg:ellipse cx="145" cy="77" rx="9" ry="8"/>
          <svg:ellipse cx="81" cy="135" rx="7" ry="5"/><svg:ellipse cx="157" cy="139" rx="6" ry="5"/>
        } @else {
          <svg:ellipse cx="90" cy="177" rx="9" ry="7"/><svg:ellipse cx="149" cy="186" rx="10" ry="7"/>
          <svg:ellipse cx="105" cy="192" rx="6" ry="5"/>
        }
      } @else if (pattern() === 'stripes') {
        @if (head()) {
          <svg:path d="m101 67 6 18 5-19m7-3 1 20 7-19m7 2-1 17 10-16M76 126l17 6-16 4m85-10-15 6 15 4"/>
        } @else {
          <svg:path d="m78 168 26 8-25 3m-1 8 24 7-22 3m80-31-22 10 24 1m1 9-24 8 23 2"/>
        }
      }
    </svg:g>
    <svg:g class="dirt" [style.opacity]="dirt()">
      @if (head()) {
        <svg:path d="M77 140q-5-8 3-12 7-3 10 4 10-1 10 7-1 9-11 7-7 4-12-6ZM143 76q-6-6 1-10 8-3 12 5 6 5 0 9-7 3-13-4Z"/>
        <svg:circle cx="151" cy="146" r="5"/><svg:circle cx="101" cy="149" r="2.5"/><svg:circle cx="137" cy="70" r="2"/>
      } @else {
        <svg:path d="M81 183q-9-5-4-13 5-6 12-1 9-4 13 3 4 8-5 12-8 6-16-1ZM131 190q-3-8 5-11 9-4 12 4 11 1 10 9-4 9-14 5-9 3-13-7Z"/>
        <svg:circle cx="112" cy="188" r="3"/><svg:circle cx="124" cy="176" r="2"/><svg:circle cx="94" cy="199" r="3"/>
      }
    </svg:g>
  `,
  styles: `
    .markings { fill: var(--accent); opacity: .8; }
    .dirt { fill: #725039; stroke: #efdbac; stroke-width: .7; transition: opacity .8s ease; }
    @media (prefers-reduced-motion: reduce) { .dirt { transition: none; } }
  `
})
export class PetSurfaceComponent {
  readonly head = input(false);
  readonly pattern = input<PetCoatPattern>('plain');
  readonly dirt = input(0);
}
