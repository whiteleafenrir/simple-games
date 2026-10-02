import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  viewChild
} from '@angular/core';
import * as THREE from 'three';
import { CatVisual, createCatVisual } from './cat-3d-model';
import { PetVisualState } from './pet-visual-state';

@Component({
  selector: 'app-pet-cat-3d',
  template: '<canvas #canvas aria-hidden="true"></canvas>',
  styles: `
    :host {
      display: block;
      width: 100%;
      aspect-ratio: 1;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetCat3dComponent {
  readonly state = input.required<PetVisualState>();
  readonly unavailable = output<void>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private renderer?: THREE.WebGLRenderer;
  private model?: CatVisual;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1.4, 1.4, 1.4, -1.4, 0.1, 30);
  private settings?: PetVisualState;
  private frame = 0;
  private seconds = 0;
  private previousStamp = 0;
  private visible = false;
  private motion?: MediaQueryList;
  private intersection?: IntersectionObserver;
  private resize?: ResizeObserver;
  private failed = false;

  constructor() {
    effect(() => {
      this.settings = this.state();
      this.zone.runOutsideAngular(() => this.refresh());
    });
    afterNextRender(() => this.zone.runOutsideAngular(() => this.mount()));
    this.destroyRef.onDestroy(() => {
      this.stop();
      this.intersection?.disconnect();
      this.resize?.disconnect();
      this.motion?.removeEventListener('change', this.onEnvironmentChange);
      document.removeEventListener('visibilitychange', this.onEnvironmentChange);
      this.canvas().nativeElement.removeEventListener('webglcontextlost', this.onContextLost);
      this.model?.dispose();
      this.renderer?.dispose();
      this.renderer?.forceContextLoss();
      this.scene.clear();
    });
  }

  private mount(): void {
    const canvas = this.canvas().nativeElement;
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motion.addEventListener('change', this.onEnvironmentChange);
    document.addEventListener('visibilitychange', this.onEnvironmentChange);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.resize = new ResizeObserver(() => {
      this.resizeCanvas();
      this.refresh();
    });
    this.resize.observe(canvas);
    this.intersection = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      if (this.visible && !this.renderer && !this.failed) this.initialize();
      this.refresh();
    });
    this.intersection.observe(canvas);
  }

  private initialize(): void {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas().nativeElement,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.model = createCatVisual();
      this.scene.add(this.model.root, new THREE.HemisphereLight('#fff3df', '#a6bac0', 1.8));
      const key = new THREE.DirectionalLight('#fff6e6', 2.6);
      key.position.set(-3, 5, 5);
      const fill = new THREE.DirectionalLight('#dce9ff', 1.1);
      fill.position.set(3, 2, -3);
      this.scene.add(key, fill);
      this.camera.position.set(0, 2.6, 6);
      this.camera.lookAt(0, 1.07, 0);
      this.resizeCanvas();
    } catch {
      this.fail();
    }
  }

  private resizeCanvas(): void {
    if (!this.renderer) return;
    const { width, height } = this.canvas().nativeElement.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -1.4 * aspect;
    this.camera.right = 1.4 * aspect;
    this.camera.updateProjectionMatrix();
  }

  private readonly onEnvironmentChange = (): void => this.refresh();
  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.fail();
  };

  private fail(): void {
    if (this.failed || this.destroyRef.destroyed) return;
    this.failed = true;
    this.stop();
    this.zone.run(() => this.unavailable.emit());
  }

  private stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previousStamp = 0;
  }

  private refresh(): void {
    this.stop();
    if (this.destroyRef.destroyed || !this.visible || document.hidden || this.failed || !this.renderer) return;
    this.draw();
    if (this.settings?.animated && !this.settings.paused && !this.motion?.matches) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private readonly tick = (stamp: number): void => {
    if (this.destroyRef.destroyed || this.failed) return;
    if (!this.previousStamp) this.previousStamp = stamp;
    const elapsed = (stamp - this.previousStamp) / 1000;
    // 30 fps is enough for these gentle loops and keeps gallery GPU use bounded.
    if (elapsed >= 1 / 30) {
      this.seconds += Math.min(elapsed, 0.1);
      this.previousStamp = stamp;
      this.draw();
    }
    if (!this.failed) this.frame = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    if (!this.settings || !this.model || !this.renderer) return;
    try {
      this.model.update(this.settings, this.motion?.matches || !this.settings.animated ? 0 : this.seconds);
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.fail();
    }
  }
}
