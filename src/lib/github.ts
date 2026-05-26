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

function b64DecodeUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function b64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function fetchFile(path: string): Promise<string> {
  const { content } = await fetchFileWithMeta(path);
  return content;
}

export async function fetchFileWithMeta(path: string): Promise<{ content: string; sha: string }> {
  const res = await ghFetch(path);
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  const data = await res.json();
  return { content: b64DecodeUtf8(data.content), sha: data.sha };
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
    body: JSON.stringify({ message, content: b64EncodeUtf8(content), sha }),
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
