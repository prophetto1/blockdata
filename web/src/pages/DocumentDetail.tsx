import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Button, Loader, Center, Text, Group, Paper, Stack, Skeleton } from '@mantine/core';
import { IconInfoCircle, IconDownload, IconFileText } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { downloadFromEdge } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { BlockViewer } from '@/components/blocks/BlockViewer';

const STATUS_COLOR: Record<string, string> = {
  ingested: 'green',
  converting: 'yellow',
  uploaded: 'blue',
  conversion_failed: 'red',
  ingest_failed: 'red',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentDetail() {
  const { sourceUid } = useParams<{ sourceUid: string }>();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUid) return;
    supabase
      .from(TABLES.documents)
      .select('*')
      .eq('source_uid', sourceUid)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (!data) setError('Document not found');
        else setDoc(data as DocumentRow);
        setLoading(false);
      });
  }, [sourceUid]);

  const exportJsonl = async () => {
    if (!doc?.conv_uid) return;
    try {
      await downloadFromEdge(
        `export-jsonl?conv_uid=${encodeURIComponent(doc.conv_uid)}`,
        `export-${doc.conv_uid.slice(0, 12)}.jsonl`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <Stack gap="md">
        <Skeleton height={40} width={300} />
        <Skeleton height={20} width={200} />
        <Skeleton height={400} />
      </Stack>
    );
  }

  if (!doc) return <ErrorAlert message={error ?? 'Document not found'} />;

  return (
    <>
      <PageHeader title={doc.doc_title}>
        <Badge size="lg" color={STATUS_COLOR[doc.status] ?? 'gray'} variant="light">
          {doc.status}
        </Badge>
        {doc.conv_uid && (
          <Button
            variant="light"
            size="xs"
            onClick={exportJsonl}
            leftSection={<IconDownload size={14} />}
          >
            Export JSONL
          </Button>
        )}
      </PageHeader>

      {/* Document metadata bar */}
      <Paper p="xs" mb="md" withBorder>
        <Group gap="lg">
          <Group gap={4}>
            <IconFileText size={14} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">{doc.source_type}</Text>
          </Group>
          <Text size="xs" c="dimmed">{formatBytes(doc.source_filesize)}</Text>
          {doc.source_total_characters && (
            <Text size="xs" c="dimmed">{doc.source_total_characters.toLocaleString()} chars</Text>
          )}
          <Text size="xs" c="dimmed">Uploaded {new Date(doc.uploaded_at).toLocaleString()}</Text>
        </Group>
      </Paper>

      {error && <ErrorAlert message={error} />}

      {doc.status === 'converting' && (
        <Alert color="yellow" icon={<IconInfoCircle size={18} />} mb="md">
          Conversion in progress. Refresh in a moment.
        </Alert>
      )}

      {(doc.status === 'conversion_failed' || doc.status === 'ingest_failed') && (
        <Alert color="red" icon={<IconInfoCircle size={18} />} mb="md">
          {doc.error || 'Processing failed.'}
        </Alert>
      )}

      {doc.status === 'uploaded' && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text c="dimmed" size="sm">Document uploaded, awaiting processing...</Text>
          </Stack>
        </Center>
      )}

      {doc.status === 'ingested' && doc.conv_uid && (
        <BlockViewer convUid={doc.conv_uid} />
      )}
    </>
  );
}
