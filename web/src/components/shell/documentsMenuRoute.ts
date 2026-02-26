export function isDocumentsMenuRoute(pathname: string): boolean {
  return (
    /^\/app\/projects\/[^/]+\/upload/.test(pathname)
    || (
      pathname.startsWith('/app/projects')
      && !pathname.startsWith('/app/projects/list')
    )
    || pathname.startsWith('/app/extract')
    || pathname.startsWith('/app/transform')
  );
}

