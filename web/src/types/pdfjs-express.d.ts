declare module '@pdftron/pdfjs-express' {
  type WebViewerOptions = {
    path: string;
    initialDoc?: string;
    licenseKey?: string;
    enableReadOnlyMode?: boolean;
    disabledElements?: string[];
  };

  type WebViewerInstance = {
    UI?: {
      setTheme?: (theme: 'light' | 'dark') => void;
      FitMode?: {
        FitWidth?: string;
      };
      setFitMode?: (mode: unknown) => void;
      setToolbarGroup?: (group: string) => void;
      disableElements?: (elements: string[]) => void;
    };
  };

  const WebViewer: (
    options: WebViewerOptions,
    element: HTMLElement,
  ) => Promise<WebViewerInstance>;

  export default WebViewer;
}
