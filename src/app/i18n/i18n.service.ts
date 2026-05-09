import { Injectable } from '@angular/core';

import { UserSettingsService } from '../settings/user-settings.service';
import { Language, TRANSLATIONS, TranslationKey } from './translations';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  constructor(private readonly settings: UserSettingsService) {}

  t(key: TranslationKey): string {
    return TRANSLATIONS[this.settings.language()][key];
  }

  language(): Language {
    return this.settings.language();
  }
}
