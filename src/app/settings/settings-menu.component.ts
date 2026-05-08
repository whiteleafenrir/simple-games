import { Component, signal } from '@angular/core';

import { I18nService } from '../i18n/i18n.service';
import { Language } from '../i18n/translations';
import { UserService } from '../users/user.service';
import { Theme } from './user-settings.model';
import { UserSettingsService } from './user-settings.service';

@Component({
  selector: 'app-settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrls: ['./settings-menu.component.css']
})
export class SettingsMenuComponent {
  readonly isOpen = signal<boolean>(false);

  constructor(
    public readonly i18n: I18nService,
    public readonly settings: UserSettingsService,
    public readonly userService: UserService
  ) {}

  toggle(): void {
    this.isOpen.update((isOpen: boolean): boolean => !isOpen);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setTheme(theme: Theme): void {
    this.settings.setTheme(theme);
  }

  setLanguage(language: Language): void {
    this.settings.setLanguage(language);
  }
}
