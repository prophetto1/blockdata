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

type RegistryAccessOptions = {
  registryTable: string;
  notConfiguredMessage: string;
  forbiddenMessage: string;
};

async function requireRegistryAccess(
  req: Request,
  options: RegistryAccessOptions,
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
    .from(options.registryTable)
    .select("email_normalized")
    .eq("is_active", true)
    .limit(1);
  if (anyActiveError) {
    throw new Error(`Failed to load registry access: ${anyActiveError.message}`);
  }
  if (!anyActiveRows || anyActiveRows.length === 0) {
    throw new Error(options.notConfiguredMessage);
  }

  const { data: matchingRows, error: matchError } = await admin
    .from(options.registryTable)
    .select("email_normalized")
    .eq("email_normalized", email)
    .eq("is_active", true)
    .limit(1);
  if (matchError) {
    throw new Error(`Failed to evaluate registry access: ${matchError.message}`);
  }
  if (!matchingRows || matchingRows.length === 0) {
    throw new Error(options.forbiddenMessage);
  }

  return {
    userId: user.id,
    email,
  };
}

export async function requireSuperuser(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  return requireRegistryAccess(
    req,
    {
      registryTable: "registry_superuser_profiles",
      notConfiguredMessage: "Superuser access is not configured",
      forbiddenMessage: "Forbidden: superuser access required",
    },
    deps,
  );
}

export async function requireBlockdataAdmin(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  return requireRegistryAccess(
    req,
    {
      registryTable: "registry_blockdata_admin_profiles",
      notConfiguredMessage: "Blockdata Admin access is not configured",
      forbiddenMessage: "Forbidden: blockdata admin access required",
    },
    deps,
  );
}

export async function requireAgchainAdmin(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  return requireRegistryAccess(
    req,
    {
      registryTable: "registry_agchain_admin_profiles",
      notConfiguredMessage: "AGChain Admin access is not configured",
      forbiddenMessage: "Forbidden: agchain admin access required",
    },
    deps,
  );
}
