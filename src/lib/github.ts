import { getSettings } from './settings.ts';

async function ghFetch(path: string): Promise<Response> {
  const { token, owner, repo } = getSettings();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  return fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
}

export async function fetchFile(path: string): Promise<string> {
  const { content } = await fetchFileWithMeta(path);
  return content;
}

export async function fetchFileWithMeta(path: string): Promise<{ content: string; sha: string }> {
  const res = await ghFetch(path);
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  const data = await res.json();
  return { content: atob(data.content), sha: data.sha };
}

export async function updateFile(path: string, content: string, sha: string, message: string): Promise<void> {
  const { token, owner, repo } = getSettings();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ message, content: btoa(content), sha }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: failed to update ${path}`);
}

export interface DirEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export async function fetchDir(path: string): Promise<DirEntry[]> {
  const res = await ghFetch(path);
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  const data = await res.json();
  return data.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type,
  }));
}
