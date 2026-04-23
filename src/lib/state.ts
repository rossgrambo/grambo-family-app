import { getSettings } from './settings.ts';

export interface ScheduleState {
  person: string;
  day: string;
  stepIndex: number;
}

const LOCAL_KEY = 'grambo-schedule-state';

function today(): string {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
}

function getLocalState(person: string): ScheduleState {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}-${person}`);
    if (raw) {
      const s: ScheduleState = JSON.parse(raw);
      if (s.day === today()) return s;
    }
  } catch { /* ignore */ }
  return { person, day: today(), stepIndex: 0 };
}

function setLocalState(state: ScheduleState) {
  localStorage.setItem(`${LOCAL_KEY}-${state.person}`, JSON.stringify(state));
}

export async function getState(person: string): Promise<ScheduleState> {
  const { stateServerUrl } = getSettings();
  if (stateServerUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${stateServerUrl}/state/${person}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.day === today()) {
          setLocalState(data);
          return data;
        }
      }
    } catch { /* fall through to local */ }
  }
  return getLocalState(person);
}

export async function setState(state: ScheduleState): Promise<void> {
  setLocalState(state);
  const { stateServerUrl } = getSettings();
  if (stateServerUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      await fetch(`${stateServerUrl}/state/${state.person}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch { /* server down, local is fine */ }
  }
}
