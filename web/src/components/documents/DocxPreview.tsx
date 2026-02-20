import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Center, Group, Loader, Text, useComputedColorScheme } from '@mantine/core';
import { IconDownload, IconFileText } from '@tabler/icons-react';
import { renderAsync } from 'docx-preview';

type DocxPreviewProps = {
  title: string;
  url: string;
};

export function DocxPreview({ title, url }: DocxPreviewProps) {
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';
  const renderHostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderHost = renderHostRef.current;
    if (!renderHost) return;

    renderHost.innerHTML = '';
    setLoading(true);
    setError(null);

    const renderDocx = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (cancelled) return;

        await renderAsync(bytes, renderHost, renderHost, {
          className: 'docx',
          inWrapper: false,
          breakPages: false,
          ignoreHeight: true,
          ignoreWidth: true,
          ignoreLastRenderedPageBreak: false,
        });

        if (cancelled) return;
        setLoading(false);
      } catch {
        if (cancelled) return;
        renderHost.innerHTML = '';
        setError('DOCX preview unavailable for this file.');
        setLoading(false);
      }
    };

    void renderDocx();
    return () => {
      cancelled = true;
      renderHost.innerHTML = '';
    };
  }, [url]);

  return (
    <Box className={`parse-docx-preview${isDark ? ' is-dark' : ' is-light'}`}>
      <Group justify="space-between" wrap="nowrap" className="parse-text-preview-header">
        <Group gap={6} wrap="nowrap" className="parse-text-preview-file">
          <IconFileText size={14} />
          <Text size="xs" className="parse-text-preview-filename" title={title}>
            {title}
          </Text>
        </Group>
        <ActionIcon
          size="sm"
          variant="subtle"
          component="a"
          href={url}
          target="_blank"
          rel="noreferrer"
          download
          aria-label="Download docx"
        >
          <IconDownload size={14} />
        </ActionIcon>
      </Group>

      <Box className="parse-docx-preview-viewport">
        {loading && (
          <Center h="100%">
            <Loader size="sm" />
          </Center>
        )}
        {!loading && error && (
          <Center h="100%" p="sm">
            <Text size="sm" c="dimmed" ta="center">{error}</Text>
          </Center>
        )}
        <Box
          ref={renderHostRef}
          className={`parse-docx-render-host${loading || !!error ? ' is-hidden' : ''}`}
        />
      </Box>
    </Box>
  );
}
