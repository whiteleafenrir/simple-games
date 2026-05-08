import { Injectable, effect, signal } from '@angular/core';

import { UserService } from '../users/user.service';
import { Theme, UserSettings } from './user-settings.model';
import { Language } from '../i18n/translations';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'ru'
};

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  readonly theme = signal<Theme>(DEFAULT_SETTINGS.theme);
  readonly language = signal<Language>(DEFAULT_SETTINGS.language);

  constructor(private readonly userService: UserService) {
    const savedSettings: UserSettings = this.readSettings();
    this.theme.set(savedSettings.theme);
    this.language.set(savedSettings.language);

    effect((): void => {
      const settings: UserSettings = {
        theme: this.theme(),
        language: this.language()
      };

      this.applyTheme(settings.theme);
      this.writeSettings(settings);
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  setLanguage(language: Language): void {
    this.language.set(language);
  }

  private storageKey(): string {
    return `simple-games:${this.userService.currentUser().id}:settings`;
  }

  private readSettings(): UserSettings {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_SETTINGS;
    }

    const rawSettings: string | null = localStorage.getItem(this.storageKey());

    if (!rawSettings) {
      return DEFAULT_SETTINGS;
    }

    try {
      const parsedSettings = JSON.parse(rawSettings) as Partial<UserSettings>;
      return {
        theme: parsedSettings.theme === 'dark' ? 'dark' : 'light',
        language: parsedSettings.language === 'en' ? 'en' : 'ru'
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private writeSettings(settings: UserSettings): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(), JSON.stringify(settings));
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset['theme'] = theme;
    document.documentElement.style.colorScheme = theme;
  }
}
