import { useEffect, useState } from 'react';
import { Table, Badge, Anchor, Loader, Center } from '@mantine/core';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const STATUS_COLOR: Record<string, string> = {
  ingested: 'green',
  converting: 'yellow',
  uploaded: 'blue',
  conversion_failed: 'red',
  ingest_failed: 'red',
};

export default function Documents() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from(TABLES.documents)
      .select('source_uid, conv_uid, source_type, doc_title, status, error, uploaded_at, owner_id, source_filesize, source_total_characters')
      .order('uploaded_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as DocumentRow[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <PageHeader title="Documents" subtitle="All ingested documents." />
      {error && <ErrorAlert message={error} />}
      <Table.ScrollContainer minWidth={600}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Uploaded</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.source_uid}>
                <Table.Td>
                  <Anchor component={Link} to={`/app/documents/${r.source_uid}`} size="sm">
                    {r.doc_title}
                  </Anchor>
                </Table.Td>
                <Table.Td>{r.source_type}</Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLOR[r.status] ?? 'gray'}>{r.status}</Badge>
                </Table.Td>
                <Table.Td>{new Date(r.uploaded_at).toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4} ta="center" c="dimmed">No documents yet.</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}
