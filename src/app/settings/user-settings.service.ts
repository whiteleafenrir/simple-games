import { Injectable, effect, signal } from '@angular/core';

import { Theme, UserSettings } from './user-settings.model';
import { Language } from '../i18n/translations';
import { readUserSettings, writeUserSettings } from './user-settings.storage';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  readonly theme = signal<Theme>('light');
  readonly language = signal<Language>('ru');

  constructor() {
    const savedSettings = readUserSettings();
    this.theme.set(savedSettings.theme);
    this.language.set(savedSettings.language);

    effect((): void => {
      const settings: UserSettings = {
        theme: this.theme(),
        language: this.language()
      };

      this.applySettings(settings);
      writeUserSettings(settings);
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  setLanguage(language: Language): void {
    this.language.set(language);
  }

  private applySettings(settings: UserSettings): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset['theme'] = settings.theme;
    document.documentElement.style.colorScheme = settings.theme;
    document.documentElement.lang = settings.language;
  }
}
