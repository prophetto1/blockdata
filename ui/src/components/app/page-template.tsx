"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type Breadcrumb = {
  label: string;
  href?: string;
};

export type PageTemplateProps = {
  /** Page title shown in the header */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Breadcrumb trail (omit home, it's always included) */
  breadcrumbs?: Breadcrumb[];
  /** Require authentication to view this page */
  requireAuth?: boolean;
  /** Loading state — shows loading card instead of children */
  loading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Error state — shows error card instead of children */
  error?: string | null;
  /** Page content */
  children: ReactNode;
};

function SignInPrompt() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in required</CardTitle>
        <CardDescription>
          You need to be signed in to view this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/">Go to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingCard({ message }: { message?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading
        </CardTitle>
        <CardDescription>{message || "Fetching data..."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          Error
        </CardTitle>
        <CardDescription className="text-destructive/80">{error}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function BreadcrumbNav({ items }: { items: Breadcrumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        Documents
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageTemplate({
  title,
  description,
  breadcrumbs = [],
  requireAuth = true,
  loading = false,
  loadingMessage,
  error,
  children,
}: PageTemplateProps) {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    supabase.auth.getSession().then((r) => {
      if (!mounted) return;
      setSignedIn(Boolean(r.data.session));
      setSessionReady(true);
      initialized = true;
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return;
      if (initialized) {
        setSignedIn(Boolean(session));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Determine what to render
  let content: ReactNode;

  if (!sessionReady) {
    content = <LoadingCard message="Initializing session..." />;
  } else if (requireAuth && !signedIn) {
    content = <SignInPrompt />;
  } else if (loading) {
    content = <LoadingCard message={loadingMessage} />;
  } else if (error) {
    content = <ErrorCard error={error} />;
  } else {
    content = children;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && <BreadcrumbNav items={breadcrumbs} />}

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      {/* Content */}
      {content}
    </div>
  );
}

/** Hook to get auth state for pages that need to check before loading data */
export function useAuth() {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // Get initial session
    supabase.auth.getSession().then((r) => {
      if (!mounted) return;
      setSignedIn(Boolean(r.data.session));
      setUserId(r.data.session?.user?.id ?? null);
      setSessionReady(true);
      initialized = true;
    });

    // Listen for auth changes (sign in, sign out)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Skip INITIAL_SESSION event - we handle that with getSession above
      if (event === "INITIAL_SESSION") return;
      // Only update after we've initialized
      if (initialized) {
        setSignedIn(Boolean(session));
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { sessionReady, signedIn, userId };
}
