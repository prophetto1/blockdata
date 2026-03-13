/**
 * Ambient type declarations for the Google Picker API and Google Identity Services.
 *
 * Scripts loaded at runtime:
 * - https://apis.google.com/js/api.js       → gapi.load('picker', ...)
 * - https://accounts.google.com/gsi/client  → google.accounts.oauth2.*
 *
 * Only the shapes actually used by useGoogleDrivePicker are declared here.
 * @see https://developers.google.com/drive/picker/reference
 * @see https://developers.google.com/identity/oauth2/web/reference/js-reference
 */

declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    error?: string;
    error_description?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
  }

  interface TokenClient {
    requestAccessToken(overrides?: { prompt?: string }): void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}

declare namespace google.picker {
  const enum ViewId {
    DOCS = 'all',
  }

  const enum Feature {
    MULTISELECT_ENABLED = 'multiselect',
  }

  const enum Action {
    PICKED = 'picked',
    CANCEL = 'cancel',
  }

  interface DocumentObject {
    id: string;
    name: string;
    mimeType: string;
    /** Optional — Google does not always return this field. */
    sizeBytes?: number;
    url?: string;
  }

  interface CallbackData {
    action: string;
    docs?: DocumentObject[];
  }

  class View {
    constructor(viewId: ViewId);
    setMimeTypes(mimeTypes: string): this;
  }

  class PickerBuilder {
    setAppId(appId: string): this;
    setOAuthToken(token: string): this;
    setDeveloperKey(key: string): this;
    addView(view: View | ViewId): this;
    enableFeature(feature: Feature): this;
    setCallback(callback: (data: CallbackData) => void): this;
    build(): Picker;
  }

  interface Picker {
    setVisible(visible: boolean): void;
    dispose(): void;
  }
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;
}
