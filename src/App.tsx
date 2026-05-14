import Router, { Route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { Nav } from './components/Nav.tsx';
import { Schedule } from './pages/Schedule.tsx';
import { Knowledge } from './pages/Knowledge.tsx';
import { Tasks } from './pages/Tasks.tsx';
import { Settings } from './pages/Settings.tsx';
import { getSettings } from './lib/settings.ts';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const p = (path: string) => BASE + path;

export function App() {
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setConfigured(!!(s.token && s.owner && s.repo));
  }, []);

  if (!configured) {
    return <Settings onSave={() => setConfigured(true)} />;
  }

  return (
    <div class="app">
      <Nav />
      <main>
        <Router>
          <Route path={p('/')} component={Schedule} />
          <Route path={p('/knowledge')} component={Knowledge} />
          <Route path={p('/tasks')} component={Tasks} />
          <Route path={p('/settings')} component={() => <Settings onSave={() => {}} />} />
          <Route default component={Schedule} />
        </Router>
      </main>
    </div>
  );
}
