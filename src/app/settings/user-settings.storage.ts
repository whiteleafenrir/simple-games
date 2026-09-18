import { UserSettings } from './user-settings.model';

const SETTINGS_KEY = 'simple-games:settings';
const LEGACY_SETTINGS_KEY = 'simple-games:temp-user:settings';
const DEFAULT_SETTINGS: UserSettings = { theme: 'light', language: 'ru' };

export function readUserSettings(): UserSettings {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    // Even access to window.localStorage can throw when browser storage is blocked.
    const storage = window.localStorage;
    const raw = storage.getItem(SETTINGS_KEY) ?? storage.getItem(LEGACY_SETTINGS_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }
    const settings = parsed as Record<string, unknown>;
    return {
      theme: settings['theme'] === 'dark' ? 'dark' : 'light',
      language: settings['language'] === 'en' ? 'en' : 'ru'
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeUserSettings(settings: UserSettings): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    // Preferences still work through the service signals for this page session.
  }
}
