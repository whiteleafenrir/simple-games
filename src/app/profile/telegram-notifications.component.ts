import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import type { TelegramLinkCode, TelegramLinkStatus } from '@simple-games/pet-contract';

import { I18nService } from '../i18n/i18n.service';
import type { TranslationKey } from '../i18n/translations';
import { TelegramLinkApiService } from './telegram-link-api.service';

@Component({
  selector: 'app-telegram-notifications',
  templateUrl: './telegram-notifications.component.html',
  styleUrl: './telegram-notifications.component.css'
})
export class TelegramNotificationsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(TelegramLinkApiService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly status = signal<TelegramLinkStatus | null>(null);
  protected readonly code = signal<TelegramLinkCode | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);
  protected readonly feedback = signal<TranslationKey | null>(null);
  private readonly now = signal(Date.now());
  protected readonly expiresAt = computed(() => this.code()?.expiresAt ?? this.status()?.pendingCodeExpiresAt ?? null);
  protected readonly remainingSeconds = computed(
    () => Math.max(0, Math.ceil((Date.parse(this.expiresAt() ?? '') - this.now()) / 1000)) || 0
  );
  protected readonly remainingTime = computed(() => {
    const seconds = this.remainingSeconds();
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    const refreshOnReturn = (): void => {
      if (!this.document.hidden) void this.refresh();
    };
    this.document.addEventListener('visibilitychange', refreshOnReturn);
    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      this.document.removeEventListener('visibilitychange', refreshOnReturn);
    });
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.loadStatus();
    } catch {
      this.error.set('telegramLoadError');
    } finally {
      this.busy.set(false);
    }
  }

  protected async createCode(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.feedback.set(null);
    this.code.set(null);
    try {
      const code = await this.api.createCode();
      if (this.destroyRef.destroyed) return;
      this.now.set(Date.now());
      this.code.set(code);
      this.status.set({ availability: 'coming-soon', pendingCodeExpiresAt: code.expiresAt });
    } catch {
      this.error.set('telegramCreateError');
      await this.loadStatus().catch(() => this.status.set(null));
    } finally {
      this.busy.set(false);
    }
  }

  protected async revokeCode(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.feedback.set(null);
    try {
      const status = await this.api.revokeCode();
      if (this.destroyRef.destroyed) return;
      this.status.set(status);
      this.code.set(null);
      this.feedback.set('telegramCodeRevoked');
    } catch {
      this.error.set('telegramRevokeError');
      await this.loadStatus().catch(() => this.status.set(null));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyCode(): Promise<void> {
    const code = this.code();
    if (!code || !this.remainingSeconds() || this.busy()) return;
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard unavailable.');
      await clipboard.writeText(code.token);
      this.feedback.set('telegramCodeCopied');
    } catch {
      this.feedback.set('telegramCopyFallback');
    }
  }

  private async loadStatus(): Promise<void> {
    const status = await this.api.status();
    if (this.destroyRef.destroyed) return;
    this.now.set(Date.now());
    this.status.set(status);
    if (this.code()?.expiresAt !== status.pendingCodeExpiresAt) this.code.set(null);
  }
}
