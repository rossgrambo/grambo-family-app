import { useState, useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import yaml from 'js-yaml';
import { fetchFile } from '../lib/github.ts';
import { getState, setState } from '../lib/state.ts';

interface CalendarBlock {
  start: string;
  end: string;
  label: string;
  color?: string;
}

interface TaskStep {
  time: string;
  label: string;
}

type DayMap<T> = Record<string, T[]> & { default?: T[] };

type Column =
  | { type: 'calendar'; person: string; title?: string }
  | { type: 'tasks'; person: string; title?: string };

interface Layout {
  columns: Column[];
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_TITLE = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_MINUTES = 24 * 60;
const PX_PER_HOUR = 60;
const PX_PER_MIN = PX_PER_HOUR / 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function today(): string {
  return DAYS[new Date().getDay()];
}

function todayTitle(): string {
  return DAY_TITLE[new Date().getDay()];
}

function minutesFromHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function hourLabel(h: number): string {
  if (h === 0) return '12 am';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

function pickDay<T>(file: DayMap<T> | undefined, day: string): T[] {
  if (!file) return [];
  return (file[day] as T[] | undefined) ?? file.default ?? [];
}

const DEFAULT_LAYOUT: Layout = {
  columns: [{ type: 'calendar', person: 'ross', title: 'Ross' }],
};

export function Schedule() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [calendars, setCalendars] = useState<Record<string, DayMap<CalendarBlock>>>({});
  const [schedules, setSchedules] = useState<Record<string, DayMap<TaskStep>>>({});
  const [taskStates, setTaskStates] = useState<Record<string, number>>({});
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nowLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // After data loads and grid renders, scroll the "now" line into view (~1/3 from top).
  useLayoutEffect(() => {
    if (loading) return;
    const el = nowLineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - window.innerHeight / 3;
    window.scrollTo({ top: Math.max(0, targetY) });
  }, [loading]);

  useEffect(() => {
    (async () => {
      try {
        let parsedLayout: Layout = DEFAULT_LAYOUT;
        try {
          const raw = await fetchFile('knowledge/calendars/layout.yaml');
          parsedLayout = yaml.load(raw) as Layout;
        } catch {
          // fall through to DEFAULT_LAYOUT
        }

        const calPersons = new Set<string>();
        const schPersons = new Set<string>();
        for (const col of parsedLayout.columns) {
          if (col.type === 'calendar') calPersons.add(col.person);
          else if (col.type === 'tasks') schPersons.add(col.person);
        }

        const calEntries = await Promise.all(
          [...calPersons].map(async (p): Promise<[string, DayMap<CalendarBlock>]> => {
            try {
              const raw = await fetchFile(`knowledge/calendars/${p}.yaml`);
              return [p, yaml.load(raw) as DayMap<CalendarBlock>];
            } catch {
              return [p, {} as DayMap<CalendarBlock>];
            }
          })
        );
        const schEntries = await Promise.all(
          [...schPersons].map(async (p): Promise<[string, DayMap<TaskStep>]> => {
            try {
              const raw = await fetchFile(`knowledge/schedules/${p}.yaml`);
              return [p, yaml.load(raw) as DayMap<TaskStep>];
            } catch {
              return [p, {} as DayMap<TaskStep>];
            }
          })
        );
        const stateEntries = await Promise.all(
          [...schPersons].map(async (p): Promise<[string, number]> => {
            const s = await getState(p);
            return [p, s.stepIndex];
          })
        );

        setLayout(parsedLayout);
        setCalendars(Object.fromEntries(calEntries));
        setSchedules(Object.fromEntries(schEntries));
        setTaskStates(Object.fromEntries(stateEntries));
        setLoading(false);
      } catch (e: any) {
        setError(e.message || String(e));
        setLoading(false);
      }
    })();
  }, []);

  const dayKey = today();

  const setStepIndex = async (person: string, newIndex: number) => {
    setTaskStates(prev => ({ ...prev, [person]: newIndex }));
    await setState({ person, day: dayKey, stepIndex: newIndex });
  };

  if (loading) return <div class="page"><p class="loading">Loading…</p></div>;
  if (error) return <div class="page"><p class="error">{error}</p></div>;
  if (!layout) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const gridStyle = {
    gridTemplateColumns: `56px repeat(${layout.columns.length}, minmax(0, 1fr))`,
  };

  return (
    <div class="schedule-day">
      <h2 class="schedule-day-title">{todayTitle()}</h2>
      <div class="day-grid" style={gridStyle}>
        <div class="time-gutter" style={{ height: 24 * PX_PER_HOUR + 'px' }}>
          {HOURS.map(h => (
            <div class="hour-label" key={h} style={{ top: h * PX_PER_HOUR + 'px' }}>
              {hourLabel(h)}
            </div>
          ))}
        </div>

        {layout.columns.map((col, ci) => (
          <div class="day-column" key={`${col.type}-${col.person}-${ci}`}>
            <div class="day-column-header">{col.title || col.person}</div>
            <div class="day-column-body" style={{ height: 24 * PX_PER_HOUR + 'px' }}>
              {HOURS.map(h => (
                <div class="hour-line" key={h} style={{ top: h * PX_PER_HOUR + 'px' }} />
              ))}
              <div
                class="now-line"
                style={{ top: nowMinutes * PX_PER_MIN + 'px' }}
                ref={ci === 0 ? nowLineRef : undefined}
              />

              {col.type === 'calendar' &&
                pickDay(calendars[col.person], dayKey).map((b, i) => {
                  const start = minutesFromHHMM(b.start);
                  const end = minutesFromHHMM(b.end);
                  const height = Math.max(0, end - start) * PX_PER_MIN;
                  return (
                    <div
                      key={i}
                      class={`cal-block cal-${b.color || 'other'}`}
                      style={{ top: start * PX_PER_MIN + 'px', height: height + 'px' }}
                    >
                      <div class="cal-block-time">{b.start}–{b.end}</div>
                      <div class="cal-block-label">{b.label}</div>
                    </div>
                  );
                })}

              {col.type === 'tasks' && (() => {
                const steps = pickDay(schedules[col.person], dayKey);
                const currentIndex = taskStates[col.person] ?? 0;
                return steps.map((s, i) => {
                  const start = minutesFromHHMM(s.time);
                  const nextStart = i + 1 < steps.length
                    ? minutesFromHHMM(steps[i + 1].time)
                    : DAY_MINUTES;
                  const duration = Math.max(20, nextStart - start);
                  const status = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
                  const onClick = () => {
                    if (i + 1 === currentIndex) setStepIndex(col.person, i);
                    else setStepIndex(col.person, i + 1);
                  };
                  return (
                    <div
                      key={i}
                      class={`task-block task-${status}`}
                      style={{ top: start * PX_PER_MIN + 'px', height: duration * PX_PER_MIN + 'px' }}
                      onClick={onClick}
                      role="button"
                    >
                      <div class="task-block-time">{s.time}</div>
                      <div class="task-block-label">{s.label}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
