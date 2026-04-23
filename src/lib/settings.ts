export interface AppSettings {
  token: string;
  owner: string;
  repo: string;
  stateServerUrl: string;
}

const STORAGE_KEY = 'grambo-family-settings';

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { token: '', owner: '', repo: 'grambo-family', stateServerUrl: '' };
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
