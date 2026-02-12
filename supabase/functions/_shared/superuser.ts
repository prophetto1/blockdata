import { getEnv } from "./env.ts";
import { createUserClient } from "./supabase.ts";

export type SuperuserContext = {
  userId: string;
  email: string;
};

function parseAllowlist(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  );
}

export async function requireSuperuser(req: Request): Promise<SuperuserContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const supabase = createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Invalid auth: ${error.message}`);

  const user = data.user;
  if (!user?.id) throw new Error("Invalid auth: no user");
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) throw new Error("Authenticated user has no email");

  const allowlist = parseAllowlist(getEnv("SUPERUSER_EMAIL_ALLOWLIST", ""));
  if (allowlist.size === 0) {
    throw new Error("Superuser access is not configured");
  }
  if (!allowlist.has(email)) {
    throw new Error("Forbidden: superuser access required");
  }

  return {
    userId: user.id,
    email,
  };
}
