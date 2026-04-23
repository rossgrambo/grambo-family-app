import { useState, useEffect, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import yaml from 'js-yaml';
import { fetchFile } from '../lib/github.ts';
import { getState, setState, ScheduleState } from '../lib/state.ts';

function getPersonParam(): string {
  const p = new URLSearchParams(location.search).get('person');
  return (p === 'linnea' || p === 'ross') ? p : 'ross';
}

interface Step {
  time: string;
  label: string;
}

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function today(): string {
  return DAYS[new Date().getDay()];
}

export function Schedule() {
  const [person, setPerson] = useState(getPersonParam);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const switchPerson = (p: string) => {
    setPerson(p);
    const params = new URLSearchParams(location.search);
    params.set('person', p);
    route(`${location.pathname}?${params.toString()}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [raw, state] = await Promise.all([
        fetchFile(`knowledge/schedules/${person}.yaml`),
        getState(person),
      ]);
      const parsed = yaml.load(raw) as Record<string, Step[]>;
      const day = today();
      const daySteps = parsed[day] || [];
      setSteps(daySteps);
      setCurrentStep(state.stepIndex);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [person]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    const next = Math.min(currentStep + 1, steps.length);
    setCurrentStep(next);
    await setState({ person, day: today(), stepIndex: next });
  };

  const goBack = async () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    await setState({ person, day: today(), stepIndex: prev });
  };

  const reset = async () => {
    setCurrentStep(0);
    await setState({ person, day: today(), stepIndex: 0 });
  };

  const allDone = currentStep >= steps.length;

  return (
    <div class="page">
      <div class="person-switcher">
        {['ross', 'linnea'].map(p => (
          <button
            key={p}
            class={`person-btn ${person === p ? 'active' : ''}`}
            onClick={() => switchPerson(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <h2>{today().charAt(0).toUpperCase() + today().slice(1)} — {person.charAt(0).toUpperCase() + person.slice(1)}</h2>

      {loading && <p class="loading">Loading schedule...</p>}
      {error && <p class="error">{error}</p>}

      {!loading && !error && (
        <>
          <ol class="step-list">
            {steps.map((step, i) => (
              <li
                key={i}
                class={`step ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}
              >
                <span class="step-time">{step.time}</span>
                <span class="step-label">{step.label}</span>
                {i < currentStep && <span class="step-check">✓</span>}
                {i === currentStep && <span class="step-arrow">→</span>}
              </li>
            ))}
          </ol>

          <div class="step-controls">
            <button onClick={goBack} disabled={currentStep <= 0}>Back</button>
            <button onClick={advance} disabled={allDone} class="primary">
              {allDone ? 'All Done!' : 'Next Step'}
            </button>
            <button onClick={reset}>Reset</button>
          </div>

          {allDone && <p class="all-done">All steps complete for today! 🎉</p>}
        </>
      )}
    </div>
  );
}
