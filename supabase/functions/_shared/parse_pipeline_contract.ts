type BuildRequestedPipelineConfigArgs = {
  profileId: string | null;
  profileConfig: Record<string, unknown> | null;
  configOverride: Record<string, unknown> | null;
};

export function buildRequestedPipelineConfig(
  args: BuildRequestedPipelineConfigArgs,
): Record<string, unknown> {
  if (args.configOverride && Object.keys(args.configOverride).length > 0) {
    return args.configOverride;
  }

  const profileConfig = args.profileConfig ?? {};
  if (!args.profileId) return profileConfig;

  return {
    ...profileConfig,
    _profile_id: args.profileId,
    _profile_name:
      typeof profileConfig.name === "string" ? profileConfig.name : null,
  };
}

type ResolveAppliedConfigArgs = {
  pipelineConfig: Record<string, unknown> | null | undefined;
  appliedPipelineConfig: Record<string, unknown> | null | undefined;
  parserRuntimeMeta: Record<string, unknown> | null | undefined;
};

type ResolvedAppliedConfig = {
  requestedPipelineConfig: Record<string, unknown>;
  appliedPipelineConfig: Record<string, unknown>;
  parserRuntimeMeta: Record<string, unknown>;
};

export function resolveAppliedConfig(
  args: ResolveAppliedConfigArgs,
): ResolvedAppliedConfig {
  const requested = args.pipelineConfig ?? {};
  return {
    requestedPipelineConfig: requested,
    appliedPipelineConfig: args.appliedPipelineConfig ?? requested,
    parserRuntimeMeta: args.parserRuntimeMeta ?? {},
  };
}
