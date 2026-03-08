import { createAdminClient, createUserClient } from "./supabase.ts";

export type SuperuserContext = {
  userId: string;
  email: string;
};

type UserClient = ReturnType<typeof createUserClient>;
type AdminClient = ReturnType<typeof createAdminClient>;

type SuperuserDeps = {
  createUserClient: (authHeader: string | null) => UserClient;
  createAdminClient: () => AdminClient;
};

const defaultDeps: SuperuserDeps = {
  createUserClient,
  createAdminClient,
};

export async function requireSuperuser(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const supabase = deps.createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Invalid auth: ${error.message}`);

  const user = data.user;
  if (!user?.id) throw new Error("Invalid auth: no user");
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) throw new Error("Authenticated user has no email");

  const admin = deps.createAdminClient();

  const { data: anyActiveRows, error: anyActiveError } = await admin
    .from("registry_superuser_profiles")
    .select("superuser_profile_id")
    .eq("is_active", true)
    .limit(1);
  if (anyActiveError) {
    throw new Error(`Failed to load superuser registry: ${anyActiveError.message}`);
  }
  if (!anyActiveRows || anyActiveRows.length === 0) {
    throw new Error("Superuser access is not configured");
  }

  const { data: matchingRows, error: matchError } = await admin
    .from("registry_superuser_profiles")
    .select("superuser_profile_id")
    .eq("email_normalized", email)
    .eq("is_active", true)
    .limit(1);
  if (matchError) {
    throw new Error(`Failed to evaluate superuser access: ${matchError.message}`);
  }
  if (!matchingRows || matchingRows.length === 0) {
    throw new Error("Forbidden: superuser access required");
  }

  return {
    userId: user.id,
    email,
  };
}
