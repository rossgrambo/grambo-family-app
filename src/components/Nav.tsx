const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Nav() {
  const current = location.pathname;
  const search = location.search;
  const links = [
    { href: BASE + '/', label: 'Schedule' },
    { href: BASE + '/knowledge', label: 'Knowledge' },
    { href: BASE + '/tasks', label: 'Tasks' },
    { href: BASE + '/settings', label: '⚙' },
  ];

  return (
    <nav class="nav">
      {links.map(l => (
        <a
          href={l.href + search}
          class={`nav-link ${current === l.href ? 'active' : ''}`}
          key={l.href}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
