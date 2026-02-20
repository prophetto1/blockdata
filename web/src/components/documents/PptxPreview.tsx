import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Center, Group, Loader, Text, TextInput } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react';
import { PPTXViewer } from 'pptx-viewer';

type PptxPreviewProps = {
  title: string;
  url: string;
};

export function PptxPreview({ title, url }: PptxPreviewProps) {
  const renderHostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PPTXViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideInput, setSlideInput] = useState('1');

  const syncSlideStateFromViewer = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const nextCount = Math.max(viewer.getSlideCount(), 0);
    const nextCurrentIndex = Math.max(viewer.getCurrentSlide(), 0);
    setSlideCount(nextCount);
    setCurrentSlideIndex(nextCurrentIndex);
    setSlideInput(String(nextCurrentIndex + 1));
  };

  useEffect(() => {
    let cancelled = false;

    const host = renderHostRef.current;
    if (!host) return;

    host.innerHTML = '';
    viewerRef.current?.destroy();
    viewerRef.current = null;

    const mountViewer = async () => {
      try {
        const viewer = new PPTXViewer(host, {
          showControls: false,
          keyboardNavigation: true,
        });
        viewer.on('slidechange', (index) => {
          if (cancelled) return;
          setCurrentSlideIndex(index);
          setSlideInput(String(index + 1));
        });
        viewerRef.current = viewer;
        await viewer.load(url);
        if (cancelled) return;
        syncSlideStateFromViewer();
        setLoading(false);
      } catch {
        if (cancelled) return;
        viewerRef.current?.destroy();
        viewerRef.current = null;
        host.innerHTML = '';
        setSlideCount(0);
        setCurrentSlideIndex(0);
        setSlideInput('1');
        setError('PPTX preview unavailable for this file.');
        setLoading(false);
      }
    };

    void mountViewer();
    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      host.innerHTML = '';
    };
  }, [url]);

  const controlsDisabled = loading || !!error || slideCount <= 0;
  const canGoPrev = !controlsDisabled && currentSlideIndex > 0;
  const canGoNext = !controlsDisabled && currentSlideIndex < slideCount - 1;

  const commitSlideInput = () => {
    const viewer = viewerRef.current;
    if (!viewer || slideCount <= 0) {
      setSlideInput(String(currentSlideIndex + 1));
      return;
    }
    const parsed = Number.parseInt(slideInput.trim(), 10);
    if (Number.isNaN(parsed)) {
      setSlideInput(String(currentSlideIndex + 1));
      return;
    }
    const targetOneBased = Math.min(Math.max(parsed, 1), slideCount);
    const moved = viewer.goToSlide(targetOneBased - 1);
    if (!moved) {
      setSlideInput(String(currentSlideIndex + 1));
      return;
    }
    setCurrentSlideIndex(targetOneBased - 1);
    setSlideInput(String(targetOneBased));
  };

  const goPrev = () => {
    const viewer = viewerRef.current;
    if (!viewer || !canGoPrev) return;
    viewer.previous();
    syncSlideStateFromViewer();
  };

  const goNext = () => {
    const viewer = viewerRef.current;
    if (!viewer || !canGoNext) return;
    viewer.next();
    syncSlideStateFromViewer();
  };

  return (
    <Box className="parse-pptx-preview">
      <Group justify="space-between" wrap="nowrap" className="parse-pptx-toolbar">
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="Previous slide"
            disabled={!canGoPrev}
            onClick={goPrev}
          >
            <IconChevronLeft size={14} />
          </ActionIcon>
          <TextInput
            size="xs"
            value={slideInput}
            onChange={(event) => setSlideInput(event.currentTarget.value)}
            onBlur={commitSlideInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitSlideInput();
            }}
            disabled={controlsDisabled}
            className="parse-pptx-page-input"
          />
          <Text size="xs" c="dimmed">
            of {slideCount > 0 ? slideCount : '--'}
          </Text>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="Next slide"
            disabled={!canGoNext}
            onClick={goNext}
          >
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>

        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="dimmed" className="parse-pptx-title" title={title}>
            {title}
          </Text>
          <ActionIcon
            size="sm"
            variant="subtle"
            component="a"
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            aria-label="Download pptx"
          >
            <IconDownload size={14} />
          </ActionIcon>
        </Group>
      </Group>

      <Box className="parse-pptx-preview-viewport">
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
          className={`parse-pptx-render-host${loading || !!error ? ' is-hidden' : ''}`}
        />
      </Box>
    </Box>
  );
}
