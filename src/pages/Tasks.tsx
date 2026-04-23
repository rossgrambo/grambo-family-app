import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { fetchDir, fetchFileWithMeta, updateFile, DirEntry } from '../lib/github.ts';

interface TaskItem { text: string; checked: boolean; }

function getPersonParam(): string {
  const p = new URLSearchParams(location.search).get('person');
  return (p === 'linnea' || p === 'ross') ? p : 'ross';
}

/** Parse markdown into active + done task arrays */
function parseTasks(raw: string): { active: TaskItem[]; done: TaskItem[] } {
  const active: TaskItem[] = [];
  const done: TaskItem[] = [];
  let section: 'none' | 'active' | 'done' = 'none';
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (/^##\s+active/i.test(trimmed)) { section = 'active'; continue; }
    if (/^##\s+done/i.test(trimmed)) { section = 'done'; continue; }
    if (/^#\s/.test(trimmed)) { section = 'none'; continue; }
    const m = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)/);
    if (m && section !== 'none') {
      const item = { text: m[2].trim(), checked: m[1] !== ' ' };
      if (section === 'active') active.push(item);
      else done.push(item);
    }
  }
  return { active, done };
}

/** Serialize active + done back to markdown */
function serializeTasks(title: string, active: TaskItem[], done: TaskItem[]): string {
  let md = `# ${title}\n\n## Active\n`;
  for (const t of active) md += `- [${t.checked ? 'x' : ' '}] ${t.text}\n`;
  md += `\n## Done\n`;
  for (const t of done) md += `- [x] ${t.text}\n`;
  return md;
}

export function Tasks() {
  const [person, setPerson] = useState(getPersonParam);
  const [files, setFiles] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('');
  const [active, setActive] = useState<TaskItem[]>([]);
  const [done, setDone] = useState<TaskItem[]>([]);
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState('');

  const switchPerson = (p: string) => {
    setPerson(p);
    const params = new URLSearchParams(location.search);
    params.set('person', p);
    route(`${location.pathname}?${params.toString()}`);
  };

  // Load file list and auto-select based on person
  useEffect(() => {
    fetchDir('knowledge/tasks')
      .then(entries => {
        const mdFiles = entries.filter(e => e.name.endsWith('.md'));
        setFiles(mdFiles);
        const personFile = mdFiles.find(f => f.name.toLowerCase().startsWith(person));
        setSelected(personFile ? personFile.path : mdFiles[0]?.path || '');
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // When person changes, re-select their file
  useEffect(() => {
    if (files.length === 0) return;
    const personFile = files.find(f => f.name.toLowerCase().startsWith(person));
    if (personFile) setSelected(personFile.path);
  }, [person, files]);

  // Load selected file
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetchFileWithMeta(selected)
      .then(({ content, sha: fileSha }) => {
        const titleMatch = content.match(/^#\s+(.+)/m);
        setTitle(titleMatch ? titleMatch[1] : selected);
        const parsed = parseTasks(content);
        setActive(parsed.active);
        setDone(parsed.done);
        setSha(fileSha);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selected]);

  /** Commit changes to GitHub */
  const commit = async (newActive: TaskItem[], newDone: TaskItem[], msg: string) => {
    setSaving(true);
    setError('');
    try {
      const md = serializeTasks(title, newActive, newDone);
      await updateFile(selected, md, sha, msg);
      const fresh = await fetchFileWithMeta(selected);
      const parsed = parseTasks(fresh.content);
      setActive(parsed.active);
      setDone(parsed.done);
      setSha(fresh.sha);
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeTask = (idx: number) => {
    const item = active[idx];
    const newActive = active.filter((_, i) => i !== idx);
    const newDone = [{ ...item, checked: true }, ...done];
    setActive(newActive);
    setDone(newDone);
    commit(newActive, newDone, `Done: ${item.text}`);
  };

  const uncompleteTask = (idx: number) => {
    const item = done[idx];
    const newDone = done.filter((_, i) => i !== idx);
    const newActive = [...active, { ...item, checked: false }];
    setActive(newActive);
    setDone(newDone);
    commit(newActive, newDone, `Reopen: ${item.text}`);
  };

  const deleteActive = (idx: number) => {
    const item = active[idx];
    const newActive = active.filter((_, i) => i !== idx);
    setActive(newActive);
    commit(newActive, done, `Delete: ${item.text}`);
  };

  const deleteDone = (idx: number) => {
    const item = done[idx];
    const newDone = done.filter((_, i) => i !== idx);
    setDone(newDone);
    commit(active, newDone, `Delete: ${item.text}`);
  };

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    const newActive = [...active, { text, checked: false }];
    setActive(newActive);
    setNewTask('');
    setShowAdd(false);
    commit(newActive, done, `Add: ${text}`);
  };

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

      <h2>Tasks {saving && <span class="saving">saving...</span>}</h2>

      <div class="file-tabs">
        {files.map(f => (
          <button
            key={f.path}
            class={`tab ${selected === f.path ? 'active' : ''}`}
            onClick={() => setSelected(f.path)}
          >
            {f.name.replace('.md', '').replace('-tasks', '')}
          </button>
        ))}
      </div>

      {loading && <p class="loading">Loading...</p>}
      {error && <p class="error">{error}</p>}

      {!loading && !error && (
        <div class="task-sections">
          <div class="task-section">
            <div class="task-section-header">
              <h3>Active</h3>
              <button class="add-btn" onClick={() => setShowAdd(true)}>+ Add</button>
            </div>
            {active.length === 0 && <p class="task-empty">No active tasks</p>}
            {active.map((t, i) => (
              <div class="task-row" key={`a-${i}-${t.text}`}>
                <input type="checkbox" checked={false} onChange={() => completeTask(i)} />
                <span class="task-text">{t.text}</span>
                <button class="task-delete" onClick={() => deleteActive(i)}>✕</button>
              </div>
            ))}
          </div>

          <div class="task-section">
            <h3>Done</h3>
            {done.length === 0 && <p class="task-empty">No completed tasks</p>}
            {done.map((t, i) => (
              <div class="task-row task-row-done" key={`d-${i}-${t.text}`}>
                <input type="checkbox" checked={true} onChange={() => uncompleteTask(i)} />
                <span class="task-text">{t.text}</span>
                <button class="task-delete" onClick={() => deleteDone(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div class="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div class="modal">
            <h3>Add Task</h3>
            <input
              type="text"
              class="modal-input"
              placeholder="Task description..."
              value={newTask}
              onInput={(e) => setNewTask((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
              autoFocus
            />
            <div class="modal-actions">
              <button onClick={() => setShowAdd(false)}>Cancel</button>
              <button class="primary" onClick={addTask}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
