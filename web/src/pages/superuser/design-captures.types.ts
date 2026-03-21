export type CaptureStatus = 'pending' | 'capturing' | 'complete' | 'failed';

export type PageType = 'settings' | 'editor' | 'dashboard' | 'workbench' | 'marketing';

export type ThemeRequest = 'light' | 'dark' | 'both';

export type CaptureEntry = {
  id: string;
  name: string;
  url: string;
  viewport: string;
  theme: ThemeRequest;
  pageType: PageType;
  capturedAt: string | null;
  outputDir: string;
  status: CaptureStatus;
};

export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
  pageType: PageType;
};
