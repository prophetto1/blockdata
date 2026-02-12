import { useRef, useState } from 'react';
import {
  Box,
  Button,
  FileButton,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCode,
  IconGitFork,
  IconLayoutGrid,
  IconSparkles,
  IconUpload,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { PageHeader } from '@/components/common/PageHeader';
import { parseSchemaUpload, persistSchemaUploadDraft } from '@/lib/schemaUploadClassifier';

// ─── Data ─────────────────────────────────────────────────────────────────────

type StartOption = {
  title: string;
  description: string;
  icon: TablerIcon;
  path?: string;
  kind: 'navigate' | 'upload';
};

const FEATURED: StartOption = {
  title: 'Start from Scratch',
  description:
    'Create a new schema with the step-by-step wizard. Define your fields, set instructions, and preview — all guided.',
  icon: IconSparkles,
  path: '/app/schemas/wizard?source=scratch',
  kind: 'navigate',
};

const GRID_OPTIONS: StartOption[] = [
  {
    title: 'Browse Templates',
    description: 'Start from a curated template and customize it.',
    icon: IconLayoutGrid,
    path: '/app/schemas/templates',
    kind: 'navigate',
  },
  {
    title: 'Fork Existing',
    description: 'Copy one of your schemas into the wizard.',
    icon: IconGitFork,
    path: '/app/schemas/wizard?source=existing',
    kind: 'navigate',
  },
  {
    title: 'Upload JSON',
    description: 'Import a file — routed to wizard or advanced.',
    icon: IconUpload,
    kind: 'upload',
  },
  {
    title: 'Advanced Editor',
    description: 'Open the full JSON editor directly.',
    icon: IconCode,
    path: '/app/schemas/advanced',
    kind: 'navigate',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchemaStart() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const uploadResetRef = useRef<() => void>(null);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseSchemaUpload(file.name, text);
      if (!parsed.ok) {
        notifications.show({ color: 'red', title: 'Upload parse failed', message: parsed.error });
        return;
      }
      const draftId = persistSchemaUploadDraft(parsed.draft);
      if (!draftId) {
        notifications.show({
          color: 'red',
          title: 'Upload storage failed',
          message: 'Could not store uploaded schema draft in session storage.',
        });
        return;
      }
      const query = new URLSearchParams({
        source: 'upload',
        uploadKey: draftId,
        uploadName: parsed.draft.uploadName,
      });
      const toWizard = parsed.draft.classification.mode === 'wizard';
      notifications.show({
        color: toWizard ? 'blue' : 'yellow',
        title: toWizard ? 'Upload routed to wizard' : 'Upload routed to advanced editor',
        message: parsed.draft.classification.warnings[0] ?? 'Upload classified.',
      });
      navigate(
        toWizard
          ? `/app/schemas/wizard?${query.toString()}`
          : `/app/schemas/advanced?${query.toString()}`,
      );
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Upload failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCardClick = (option: StartOption) => {
    if (option.kind === 'upload') {
      // Programmatically trigger the hidden file input
      const input = document.getElementById('schema-upload-input') as HTMLInputElement | null;
      input?.click();
    } else {
      navigate(option.path ?? '/app/schemas/start');
    }
  };

  return (
    <>
      <AppBreadcrumbs items={[{ label: 'Schemas', href: '/app/schemas' }, { label: 'Start' }]} />

      <PageHeader title="Create Schema" subtitle="Choose how to begin your schema workflow.">
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas')}>
          Back to list
        </Button>
      </PageHeader>

      {/* Hidden file input for the Upload card */}
      <FileButton resetRef={uploadResetRef} onChange={handleUpload} accept="application/json,.json">
        {(props) => (
          <button {...props} id="schema-upload-input" style={{ display: 'none' }} />
        )}
      </FileButton>

      {/* Featured: Start from Scratch */}
      <Paper
        className="schema-start-card"
        radius="md"
        mb="lg"
        onClick={() => navigate(FEATURED.path!)}
        bg="var(--mantine-color-default-hover)"
        py={40}
        px="xl"
      >
        <Stack gap="md" align="center" ta="center">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--mantine-radius-lg)',
              backgroundColor: 'var(--mantine-color-default-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FEATURED.icon size={32} style={{ color: 'var(--mantine-color-text)' }} />
          </Box>
          <div>
            <Title order={3} mb={6}>
              {FEATURED.title}
            </Title>
            <Text size="sm" c="dimmed" maw={400} mx="auto">
              {FEATURED.description}
            </Text>
          </div>
          <Button
            variant="default"
            mt="xs"
            rightSection={<IconArrowRight size={16} />}
          >
            Start wizard
          </Button>
        </Stack>
      </Paper>

      {/* Secondary options */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        {GRID_OPTIONS.map((option) => (
          <Paper
            key={option.title}
            className="schema-start-card"
            p="lg"
            radius="md"
            withBorder
            onClick={() => handleCardClick(option)}
          >
            <Stack gap="md" align="center" ta="center" py="sm">
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--mantine-radius-md)',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <option.icon size={24} style={{ color: 'var(--mantine-color-dimmed)' }} />
              </Box>
              <div>
                <Text fw={600} mb={4}>
                  {option.title}
                </Text>
                <Text size="xs" c="dimmed" lh={1.5}>
                  {option.description}
                </Text>
              </div>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </>
  );
}
