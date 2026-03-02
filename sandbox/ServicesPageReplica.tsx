import { useMemo, useState } from 'react';
import { PageHeader } from '../web/src/components/common/PageHeader';
import { ServiceDetailRailView } from '../web/src/pages/settings/ServiceDetailRailView';
import { ServicesSidebar } from '../web/src/pages/settings/ServicesSidebar';
import type {
  InlineStatus,
  ServiceFunctionRow,
  ServiceRow,
  ServiceTypeRow,
} from '../web/src/pages/settings/services-panel.types';
import { styleTokens } from '../web/src/lib/styleTokens';

const MOCK_SERVICE_TYPES: ServiceTypeRow[] = [
  {
    service_type: 'document',
    label: 'Document',
    description: 'Document parsing and extraction services',
  },
  {
    service_type: 'workflow',
    label: 'Workflow',
    description: 'Workflow orchestration services',
  },
  {
    service_type: 'integration',
    label: 'Integration',
    description: 'Third-party integration services',
  },
];

const MOCK_SERVICES: ServiceRow[] = [
  {
    service_id: 'svc-parseeasy',
    service_type: 'document',
    service_name: 'ParseEasy',
    base_url: '{{BLOCKDATA_API_BASE_URL}}',
    health_status: 'online',
    last_heartbeat: '2026-03-02T20:40:00.000Z',
    enabled: true,
    config: {
      auth_type: 'api_key',
      timeout_ms: 12000,
      retries: 2,
    },
    created_at: '2026-02-15T10:00:00.000Z',
    updated_at: '2026-03-02T20:40:00.000Z',
  },
  {
    service_id: 'svc-docling',
    service_type: 'document',
    service_name: 'Docling',
    base_url: '{{BLOCKDATA_API_BASE_URL}}',
    health_status: 'degraded',
    last_heartbeat: '2026-03-02T20:38:00.000Z',
    enabled: true,
    config: {
      auth_type: 'oauth2',
      region: 'us-west-2',
    },
    created_at: '2026-02-18T09:30:00.000Z',
    updated_at: '2026-03-02T20:38:00.000Z',
  },
  {
    service_id: 'svc-kestra',
    service_type: 'workflow',
    service_name: 'Kestra',
    base_url: '{{BLOCKDATA_API_BASE_URL}}',
    health_status: 'offline',
    last_heartbeat: '2026-03-02T19:52:00.000Z',
    enabled: false,
    config: {
      auth_type: 'none',
      queue: 'default',
    },
    created_at: '2026-02-20T07:12:00.000Z',
    updated_at: '2026-03-02T19:52:00.000Z',
  },
];

const MOCK_FUNCTIONS: ServiceFunctionRow[] = [
  {
    function_id: 'fn-parseeasy-parse_pdf',
    service_id: 'svc-parseeasy',
    function_name: 'parse_pdf',
    function_type: 'parse',
    label: 'Parse PDF',
    description: 'Extract text and structure from PDF files.',
    entrypoint: '/services/parseeasy/parse-pdf',
    http_method: 'POST',
    parameter_schema: [
      { name: 'file_url', type: 'string', required: true, description: 'Public file URL' },
      { name: 'language', type: 'string', required: false, default: 'en', values: ['en', 'es'] },
      { name: 'ocr', type: 'boolean', required: false, default: false },
    ],
    result_schema: {
      pages: 'number',
      blocks: 'array',
      text: 'string',
    },
    enabled: true,
    tags: ['pdf', 'ocr', 'text'],
    created_at: '2026-02-15T10:30:00.000Z',
    updated_at: '2026-03-02T20:40:00.000Z',
  },
  {
    function_id: 'fn-parseeasy-parse_docx',
    service_id: 'svc-parseeasy',
    function_name: 'parse_docx',
    function_type: 'parse',
    label: 'Parse DOCX',
    description: 'Extract semantic sections from DOCX files.',
    entrypoint: '/services/parseeasy/parse-docx',
    http_method: 'POST',
    parameter_schema: [
      { name: 'file_url', type: 'string', required: true, description: 'Public file URL' },
      { name: 'include_styles', type: 'boolean', required: false, default: true },
    ],
    result_schema: {
      sections: 'array',
      metadata: 'object',
    },
    enabled: true,
    tags: ['docx', 'sections'],
    created_at: '2026-02-15T10:35:00.000Z',
    updated_at: '2026-03-02T20:40:00.000Z',
  },
  {
    function_id: 'fn-docling-transform',
    service_id: 'svc-docling',
    function_name: 'transform_document',
    function_type: 'transform',
    label: 'Transform Document',
    description: 'Convert parsed blocks into a normalized schema.',
    entrypoint: '/services/docling/transform',
    http_method: 'POST',
    parameter_schema: [
      { name: 'document_id', type: 'string', required: true },
      { name: 'target_schema', type: 'string', required: true, values: ['v1', 'v2'] },
    ],
    result_schema: {
      transformed: 'boolean',
      records: 'array',
    },
    enabled: true,
    tags: ['transform', 'normalize'],
    created_at: '2026-02-18T09:45:00.000Z',
    updated_at: '2026-03-02T20:38:00.000Z',
  },
  {
    function_id: 'fn-kestra-run-flow',
    service_id: 'svc-kestra',
    function_name: 'run_flow',
    function_type: 'utility',
    label: 'Run Flow',
    description: 'Trigger a workflow execution by namespace and flow id.',
    entrypoint: '/services/kestra/run-flow',
    http_method: 'POST',
    parameter_schema: [
      { name: 'namespace', type: 'string', required: true },
      { name: 'flow_id', type: 'string', required: true },
      { name: 'inputs', type: 'object', required: false, default: {} },
    ],
    result_schema: {
      execution_id: 'string',
      status: 'string',
    },
    enabled: false,
    tags: ['workflow', 'execute'],
    created_at: '2026-02-20T07:20:00.000Z',
    updated_at: '2026-03-02T19:52:00.000Z',
  },
];

function isoNow(): string {
  return new Date().toISOString();
}

export default function ServicesPageReplica() {
  const [serviceTypes] = useState<ServiceTypeRow[]>(MOCK_SERVICE_TYPES);
  const [services] = useState<ServiceRow[]>(MOCK_SERVICES);
  const [functions, setFunctions] = useState<ServiceFunctionRow[]>(MOCK_FUNCTIONS);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    MOCK_SERVICES[0]?.service_id ?? null,
  );

  const selectedService = useMemo(
    () => services.find((s) => s.service_id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const functionsForSelected = useMemo(
    () =>
      selectedServiceId
        ? functions.filter((f) => f.service_id === selectedServiceId)
        : [],
    [functions, selectedServiceId],
  );

  const withMutation = (
    key: string,
    action: () => void,
    successMessage: string,
  ) => {
    setStatus(null);
    setSavingKey(key);
    window.setTimeout(() => {
      action();
      setStatus({ kind: 'success', message: successMessage });
      setSavingKey(null);
    }, 200);
  };

  const handleToggleFunctionEnabled = (fn: ServiceFunctionRow) => {
    withMutation(
      `function:${fn.function_id}`,
      () => {
        setFunctions((prev) =>
          prev.map((row) =>
            row.function_id === fn.function_id
              ? { ...row, enabled: !row.enabled, updated_at: isoNow() }
              : row,
          ),
        );
      },
      `${fn.function_name} ${fn.enabled ? 'disabled' : 'enabled'}.`,
    );
  };

  const handleSaveFunctionJson = (
    fn: ServiceFunctionRow,
    json: Record<string, unknown>,
  ) => {
    withMutation(
      `function:${fn.function_id}`,
      () => {
        setFunctions((prev) =>
          prev.map((row) =>
            row.function_id === fn.function_id
              ? ({
                  ...row,
                  ...(json as Partial<ServiceFunctionRow>),
                  updated_at: isoNow(),
                } as ServiceFunctionRow)
              : row,
          ),
        );
      },
      `${fn.function_name} saved.`,
    );
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Services" />
      <div className="min-h-0 flex-1 px-4 pb-4">
        <div className="flex h-full flex-col">
          {status && (
            <div
              className="mb-2 rounded-md border px-3 py-2 text-sm"
              style={
                status.kind === 'success'
                  ? {
                      borderColor: styleTokens.adminConfig.status.success.border,
                      backgroundColor:
                        styleTokens.adminConfig.status.success.background,
                      color: styleTokens.adminConfig.status.success.foreground,
                    }
                  : {
                      borderColor: styleTokens.adminConfig.status.error.border,
                      backgroundColor:
                        styleTokens.adminConfig.status.error.background,
                      color: styleTokens.adminConfig.status.error.foreground,
                    }
              }
              role="status"
              aria-live="polite"
            >
              {status.message}
            </div>
          )}

          <div className="mb-2 flex items-center px-1">
            <span className="ml-auto text-[10px] text-muted-foreground">
              {services.length} services, {functions.length} functions
            </span>
          </div>

          <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
            <ServicesSidebar
              services={services}
              functions={functions}
              serviceTypes={serviceTypes}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
              loading={false}
            />

            {selectedService ? (
              <ServiceDetailRailView
                service={selectedService}
                functions={functionsForSelected}
                savingKey={savingKey}
                notice={null}
                onToggleFunctionEnabled={handleToggleFunctionEnabled}
                onSaveFunctionJson={handleSaveFunctionJson}
                isAdmin={false}
              />
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a service to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
