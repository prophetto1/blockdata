import { useMemo, type RefObject } from 'react';

type ScalarApiPlaygroundProps = {
  specUrl?: string;
  proxyUrl?: string;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  onIframeLoad?: () => void;
};

function buildHostSrc({ specUrl, proxyUrl: proxyUrlProp }: ScalarApiPlaygroundProps) {
  const params = new URLSearchParams();

  const proxyUrl =
    proxyUrlProp ??
    (import.meta.env.VITE_SCALAR_PROXY_URL as string | undefined);

  const configuredSpecUrl =
    specUrl ??
    (import.meta.env.VITE_SCALAR_DEFAULT_SPEC_URL as string | undefined);

  if (configuredSpecUrl) {
    params.set('url', configuredSpecUrl);
  }

  if (proxyUrl) {
    params.set('proxyUrl', proxyUrl);
  }

  const query = params.toString();
  return query.length > 0 ? `/scalar-client-host.html?${query}` : '/scalar-client-host.html';
}

/**
 * Isolated host for Scalar API Client (legacy app layout).
 * Runs in an iframe to avoid routing and CSS conflicts with the React shell.
 */
export function ScalarApiPlayground({
  specUrl,
  proxyUrl,
  iframeRef,
  onIframeLoad,
}: ScalarApiPlaygroundProps) {
  const src = useMemo(() => buildHostSrc({ specUrl, proxyUrl }), [proxyUrl, specUrl]);

  return (
    <iframe
      ref={iframeRef}
      title="Scalar API Client"
      src={src}
      className="h-full min-h-0 w-full border-0"
      onLoad={onIframeLoad}
    />
  );
}
