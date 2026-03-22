const REDIRECT_ORIGIN = (
  import.meta.env.VITE_AUTH_REDIRECT_ORIGIN as string | undefined
)?.trim();

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getAuthRedirectUrl(path: string): string {
  const origin = REDIRECT_ORIGIN
    ? trimTrailingSlash(REDIRECT_ORIGIN)
    : trimTrailingSlash(window.location.origin);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
