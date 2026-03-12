/** Ambient type declarations for the OnlyOffice Document Server JS API. */

declare namespace DocsAPI {
  class DocEditor {
    constructor(containerId: string, config: DocEditorConfig);
    destroyEditor(): void;
  }

  interface DocEditorConfig {
    document: {
      fileType: string;
      key: string;
      title: string;
      url: string;
    };
    editorConfig: {
      mode: string;
      callbackUrl: string;
      lang?: string;
      customization?: Record<string, unknown>;
    };
    token?: string;
    height?: string;
    width?: string;
    type?: string;
    events?: {
      onReady?: () => void;
      onDocumentStateChange?: (event: { data: boolean }) => void;
      onError?: (event: { data: { errorCode: number; errorDescription: string } }) => void;
      onAppReady?: () => void;
    };
  }
}
