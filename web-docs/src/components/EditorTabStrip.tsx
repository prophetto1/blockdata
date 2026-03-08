import { Select, createListCollection } from '@ark-ui/react/select';
import {
  DEFAULT_EDITOR_MODE,
  type EditorMode,
} from '../lib/docs/shell-state';

const editorModeCollection = createListCollection({
  items: [
    { label: 'Rich', value: 'rich' },
    { label: 'Source', value: 'source' },
  ],
});

type EditorTabStripProps = {
  mode?: EditorMode;
  onModeChange: (next: EditorMode) => void;
};

/**
 * Controlled editor mode selector used by the split-editor shell.
 *
 * The file keeps its historical name because shell contracts and docs
 * still reference "EditorTabStrip", but the UI now renders as a Select
 * instead of button tabs.
 */
export default function EditorTabStrip({
  mode = DEFAULT_EDITOR_MODE,
  onModeChange,
}: EditorTabStripProps) {
  return (
    <div className="wa-strip__editor-mode" data-shell="editor-tab-area">
      <Select.Root
        collection={editorModeCollection}
        positioning={{ placement: 'bottom-start' }}
        value={[mode]}
        onValueChange={({ value }) => {
          const next = value[0];
          if (next === 'source' || next === 'rich') onModeChange(next);
        }}
      >
        <Select.HiddenSelect />
        <Select.Control className="wa-strip__mode-control">
          <Select.Trigger className="wa-strip__mode-trigger" aria-label="Editor mode">
            <Select.ValueText className="wa-strip__mode-value" />
            <Select.Indicator className="wa-strip__mode-indicator">
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.25 4.5 6 8.25 9.75 4.5" />
              </svg>
            </Select.Indicator>
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner className="wa-strip__mode-positioner">
          <Select.Content className="wa-strip__mode-content">
            {editorModeCollection.items.map((item) => (
              <Select.Item key={item.value} item={item} className="wa-strip__mode-item">
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator className="wa-strip__mode-item-indicator">
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="m2.25 6.25 2.2 2.2 5.3-5.2" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    </div>
  );
}
