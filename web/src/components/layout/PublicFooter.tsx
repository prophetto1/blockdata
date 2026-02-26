import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex items-start justify-between px-4 sm:px-6 md:px-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-extrabold" style={{ letterSpacing: '-0.02em' }}>
            BlockData
          </span>
          <span className="text-xs text-muted-foreground">Document Intelligence Platform</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Use cases
          </Link>
          <Link to="/integrations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Integrations
          </Link>
        </div>
      </div>
    </footer>
  );
}
