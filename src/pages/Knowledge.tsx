import { useState, useEffect } from 'preact/hooks';
import { marked } from 'marked';
import { fetchDir, fetchFile, DirEntry } from '../lib/github.ts';

export function Knowledge() {
  const [files, setFiles] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDir('knowledge')
      .then(entries => {
        const mdFiles = entries.filter(e => e.name.endsWith('.md'));
        setFiles(mdFiles);
        if (mdFiles.length > 0) {
          setSelected(mdFiles[0].path);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetchFile(selected)
      .then(raw => {
        setContent(marked.parse(raw) as string);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selected]);

  return (
    <div class="page">
      <h2>Knowledge Base</h2>

      {files.length > 1 && (
        <div class="file-tabs">
          {files.map(f => (
            <button
              key={f.path}
              class={`tab ${selected === f.path ? 'active' : ''}`}
              onClick={() => setSelected(f.path)}
            >
              {f.name.replace('.md', '')}
            </button>
          ))}
        </div>
      )}

      {loading && <p class="loading">Loading...</p>}
      {error && <p class="error">{error}</p>}
      {!loading && !error && (
        <div class="markdown-body" dangerouslySetInnerHTML={{ __html: content }} />
      )}
    </div>
  );
}
