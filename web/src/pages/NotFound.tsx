import { Link } from 'react-router-dom';
import { DOCS_URL } from '@/lib/urls';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <div className="flex gap-3">
        <Link to="/" className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80">
          Home
        </Link>
        <Link to="/app" className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80">
          App
        </Link>
        <a href={DOCS_URL} className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80">
          Docs
        </a>
      </div>
    </div>
  );
}
