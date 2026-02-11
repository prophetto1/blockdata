export type MountSchemaEditorOptions = {
  initialSchema: unknown;
  onChange?: (schemaJson: unknown) => void;
};

export type MountedSchemaEditor = {
  getSchemaJson(): unknown;
  setSchemaJson(schemaJson: unknown): void;
  destroy(): void;
};

export type MetaConfiguratorEmbed = {
  mountSchemaEditor(el: HTMLElement, options: MountSchemaEditorOptions): MountedSchemaEditor;
};

declare global {
  interface Window {
    MetaConfiguratorEmbed?: MetaConfiguratorEmbed;
  }
}

const EMBED_CSS_ID = 'meta-configurator-embed-css';
const EMBED_JS_ID = 'meta-configurator-embed-js';

const EMBED_CSS_HREF = '/meta-configurator-embed/meta-configurator-embed.css';
const EMBED_JS_SRC = '/meta-configurator-embed/meta-configurator-embed.js';

function loadCssOnce(): Promise<void> {
  const existing = document.getElementById(EMBED_CSS_ID);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.id = EMBED_CSS_ID;
    link.rel = 'stylesheet';
    link.href = EMBED_CSS_HREF;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load MetaConfigurator embed CSS: ${EMBED_CSS_HREF}`));
    document.head.appendChild(link);
  });
}

function loadScriptOnce(): Promise<void> {
  const existing = document.getElementById(EMBED_JS_ID);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = EMBED_JS_ID;
    script.src = EMBED_JS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load MetaConfigurator embed JS: ${EMBED_JS_SRC}`));
    document.head.appendChild(script);
  });
}

export async function loadMetaConfiguratorEmbed(): Promise<MetaConfiguratorEmbed> {
  if (window.MetaConfiguratorEmbed?.mountSchemaEditor) return window.MetaConfiguratorEmbed;

  await loadCssOnce();
  await loadScriptOnce();

  if (!window.MetaConfiguratorEmbed?.mountSchemaEditor) {
    throw new Error('MetaConfigurator embed loaded but mount API not found on window.MetaConfiguratorEmbed');
  }

  return window.MetaConfiguratorEmbed;
}

