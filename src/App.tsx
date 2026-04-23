import Router, { Route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { Nav } from './components/Nav.tsx';
import { Schedule } from './pages/Schedule.tsx';
import { Knowledge } from './pages/Knowledge.tsx';
import { Tasks } from './pages/Tasks.tsx';
import { Settings } from './pages/Settings.tsx';
import { getSettings } from './lib/settings.ts';

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
          <Route path="/" component={Schedule} />
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/settings" component={() => <Settings onSave={() => {}} />} />
        </Router>
      </main>
    </div>
  );
}
