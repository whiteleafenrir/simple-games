import { Language } from '../i18n/translations';

export type Theme = 'light' | 'dark';

export interface UserSettings {
  theme: Theme;
  language: Language;
}
