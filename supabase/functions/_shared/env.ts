export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getEnv(name: string, fallback: string): string {
  return Deno.env.get(name) ?? fallback;
}

