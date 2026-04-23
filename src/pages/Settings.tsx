import { useState } from 'preact/hooks';
import { getSettings, saveSettings, AppSettings } from '../lib/settings.ts';

interface Props {
  onSave: () => void;
}

export function Settings({ onSave }: Props) {
  const [form, setForm] = useState<AppSettings>(getSettings);

  const update = (key: keyof AppSettings, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: Event) => {
    e.preventDefault();
    saveSettings(form);
    onSave();
  };

  return (
    <div class="page settings">
      <h2>Setup</h2>
      <p>Connect to your GitHub repo. Your token is stored only in this browser's local storage.</p>

      <form onSubmit={handleSave}>
        <label>
          GitHub Personal Access Token
          <input
            type="password"
            value={form.token}
            onInput={e => update('token', (e.target as HTMLInputElement).value)}
            placeholder="ghp_..."
            required
          />
        </label>

        <label>
          Repo Owner (GitHub username)
          <input
            type="text"
            value={form.owner}
            onInput={e => update('owner', (e.target as HTMLInputElement).value)}
            placeholder="your-username"
            required
          />
        </label>

        <label>
          Repo Name
          <input
            type="text"
            value={form.repo}
            onInput={e => update('repo', (e.target as HTMLInputElement).value)}
            placeholder="grambo-family"
            required
          />
        </label>

        <label>
          State Server URL (optional — for cross-device schedule sync)
          <input
            type="url"
            value={form.stateServerUrl}
            onInput={e => update('stateServerUrl', (e.target as HTMLInputElement).value)}
            placeholder="http://homeassistant.local:8099"
          />
        </label>

        <button type="submit" class="primary">Save & Connect</button>
      </form>
    </div>
  );
}
