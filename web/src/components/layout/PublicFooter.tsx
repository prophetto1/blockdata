import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Use cases', to: '/use-cases' },
  { label: 'Integrations', to: '/integrations' },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6 md:px-8">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span className="text-sm font-extrabold tracking-tight">BlockData</span>
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BlockData
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
