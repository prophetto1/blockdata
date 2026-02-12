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

let cssLoadPromise: Promise<void> | null = null;
let scriptLoadPromise: Promise<void> | null = null;

function loadCssOnce(): Promise<void> {
  if (cssLoadPromise) return cssLoadPromise;
  const existing = document.getElementById(EMBED_CSS_ID);
  if (existing) {
    const link = existing as HTMLLinkElement;
    if (link.dataset.loaded === 'true') return Promise.resolve();
    cssLoadPromise = new Promise((resolve, reject) => {
      const handleLoad = () => {
        link.dataset.loaded = 'true';
        link.removeEventListener('load', handleLoad);
        link.removeEventListener('error', handleError);
        resolve();
      };
      const handleError = () => {
        link.dataset.loaded = 'error';
        link.removeEventListener('load', handleLoad);
        link.removeEventListener('error', handleError);
        reject(new Error(`Failed to load MetaConfigurator embed CSS: ${EMBED_CSS_HREF}`));
      };
      link.addEventListener('load', handleLoad);
      link.addEventListener('error', handleError);
    });
    return cssLoadPromise;
  }

  cssLoadPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.id = EMBED_CSS_ID;
    link.rel = 'stylesheet';
    link.href = EMBED_CSS_HREF;
    link.dataset.loaded = 'loading';
    link.onload = () => {
      link.dataset.loaded = 'true';
      resolve();
    };
    link.onerror = () => {
      link.dataset.loaded = 'error';
      reject(new Error(`Failed to load MetaConfigurator embed CSS: ${EMBED_CSS_HREF}`));
    };
    document.head.appendChild(link);
  });
  return cssLoadPromise;
}

function loadScriptOnce(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  const existing = document.getElementById(EMBED_JS_ID);
  if (existing) {
    const script = existing as HTMLScriptElement;
    if (script.dataset.loaded === 'true') return Promise.resolve();
    scriptLoadPromise = new Promise((resolve, reject) => {
      const handleLoad = () => {
        script.dataset.loaded = 'true';
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
        resolve();
      };
      const handleError = () => {
        script.dataset.loaded = 'error';
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
        reject(new Error(`Failed to load MetaConfigurator embed JS: ${EMBED_JS_SRC}`));
      };
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    });
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = EMBED_JS_ID;
    script.src = EMBED_JS_SRC;
    script.async = true;
    script.dataset.loaded = 'loading';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.dataset.loaded = 'error';
      reject(new Error(`Failed to load MetaConfigurator embed JS: ${EMBED_JS_SRC}`));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
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
