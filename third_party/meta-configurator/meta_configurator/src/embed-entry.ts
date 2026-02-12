import { createApp, watch, type WatchStopHandle } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Lara from '@primevue/themes/lara';
import { definePreset } from '@primevue/themes';

import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

import 'primeicons/primeicons.css';
import './embed-style.css';

import { initErrorService, useErrorService } from '@/utility/errorServiceInstance';
import { registerIcons } from '@/fontawesome';
import { registerDefaultDataFormats } from '@/dataformats/defaultFormats';
import { getDataForMode } from '@/data/useDataLink';
import { SessionMode } from '@/store/sessionMode';
import { useSessionStore } from '@/store/sessionStore';
import { useSettings } from '@/settings/useSettings';
import { SETTINGS_DATA_DEFAULT } from '@/settings/defaultSettingsData';
import { updateSettingsWithDefaults } from '@/settings/settingsUpdater';
import EmbeddedSchemaEditor from '@/embed/EmbeddedSchemaEditor.vue';

export type MountSchemaEditorOptions = {
  initialSchema: unknown;
  onChange?: (schemaJson: unknown) => void;
};

export type MountedSchemaEditor = {
  getSchemaJson(): unknown;
  setSchemaJson(schemaJson: unknown): void;
  destroy(): void;
};

function createThemePreset() {
  return definePreset(Lara, {
    semantic: {
      primary: {
        50: '{indigo.50}',
        100: '{indigo.100}',
        200: '{indigo.200}',
        300: '{indigo.300}',
        400: '{indigo.400}',
        500: '{indigo.500}',
        600: '{indigo.600}',
        700: '{indigo.700}',
        800: '{indigo.800}',
        900: '{indigo.900}',
        950: '{indigo.950}',
      },
      colorScheme: {
        light: {
          primary: {
            color: '{indigo.500}',
            hoverColor: '{indigo.900}',
            activeColor: 'black',
          },
          highlight: {
            color: '{indigo.500}',
            focusColor: '#ffffff',
          },
        },
        dark: {
          primary: {
            color: '{indigo.50}',
            hoverColor: '{indigo.100}',
            activeColor: 'white',
          },
          highlight: {
            background: '{indigo.950}',
            focusBackground: '{indigo.700}',
            color: '{indigo.300}',
            focusColor: 'rgba(255,255,255,.87)',
          },
        },
      },
    },
  });
}

export function mountSchemaEditor(el: HTMLElement, options: MountSchemaEditorOptions): MountedSchemaEditor {
  const app = createApp(EmbeddedSchemaEditor);

  app.use(createPinia());
  app.use(PrimeVue, {
    theme: {
      preset: createThemePreset(),
      options: {
        prefix: 'p',
        darkModeSelector: 'html[data-mantine-color-scheme="dark"]',
        cssLayer: false,
      },
    },
  });
  app.use(ToastService);
  app.use(ConfirmationService);
  app.directive('tooltip', Tooltip);

  // Global services used throughout the MetaConfigurator component tree
  initErrorService(app.config.globalProperties.$toast);
  app.config.errorHandler = (error: unknown) => useErrorService().onError(error);
  registerIcons();
  registerDefaultDataFormats();

  // Session setup (avoid initial dialogs / data editor redirects)
  const sessionStore = useSessionStore();
  sessionStore.currentMode = SessionMode.SchemaEditor;
  sessionStore.hasShownInitialDialog = true;

  // Settings: ensure defaults exist and hide irrelevant surfaces
  const settings = useSettings();
  const defaultSettings: any = structuredClone(SETTINGS_DATA_DEFAULT);
  updateSettingsWithDefaults(settings.value, defaultSettings);
  settings.value.hideSettings = true;
  settings.value.hideSchemaEditor = true;
  settings.value.toolbarTitle = '';

  // Load initial schema JSON
  const schemaDataLink = getDataForMode(SessionMode.SchemaEditor);
  schemaDataLink.setData(options.initialSchema ?? {});

  // Keep React host informed of changes (last-valid JSON only)
  let stopWatch: WatchStopHandle | null = null;
  if (options.onChange) {
    stopWatch = watch(
      () => schemaDataLink.data.value,
      (value) => {
        options.onChange?.(structuredClone(value));
      },
      { deep: true },
    );
    options.onChange(structuredClone(schemaDataLink.data.value));
  }

  app.mount(el);

  return {
    getSchemaJson() {
      return structuredClone(schemaDataLink.data.value);
    },
    setSchemaJson(schemaJson: unknown) {
      schemaDataLink.setData(schemaJson ?? {});
    },
    destroy() {
      stopWatch?.();
      app.unmount();
      // leave data/settings in localStorage as-is (MetaConfigurator behavior)
    },
  };
}
