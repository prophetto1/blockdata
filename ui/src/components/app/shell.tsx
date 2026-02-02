"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Layers, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    supabase.auth.getUser().then((r) => {
      if (!mounted) return;
      setEmail(r.data.user?.email ?? null);
      initialized = true;
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return;
      if (initialized) {
        setEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <FileText className="h-5 w-5" />
            Writing System
          </Link>

          <Separator orientation="vertical" className="h-6" />

          <nav className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Documents</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/schemas">
                <Layers className="mr-1 h-4 w-4" />
                Schemas
              </Link>
            </Button>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {email ? (
              <>
                <span className="text-xs text-muted-foreground">{email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Signed out</span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
