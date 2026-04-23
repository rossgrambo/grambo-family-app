export function Nav() {
  const current = location.pathname;
  const search = location.search;
  const links = [
    { href: '/', label: 'Schedule' },
    { href: '/knowledge', label: 'Knowledge' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/settings', label: '⚙' },
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
