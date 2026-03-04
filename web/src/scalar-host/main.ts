import { createApiClientApp } from '@scalar/api-client/layouts/App';
import '@scalar/api-client/style.css';

type HostConfig = {
  url?: string;
  proxyUrl?: string;
};

function parseHostConfig(): HostConfig {
  const params = new URLSearchParams(window.location.search);

  const url = params.get('url') ?? undefined;
  const proxyUrl = params.get('proxyUrl') ?? undefined;

  return { url, proxyUrl };
}

async function bootstrap() {
  const target = document.getElementById('scalar-client');
  if (!target) {
    return;
  }

  const config = parseHostConfig();

  await createApiClientApp(target, config, true);
}

void bootstrap();

