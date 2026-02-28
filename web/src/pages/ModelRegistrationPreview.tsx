import { useMemo, useState } from 'react';
import { Switch } from '@ark-ui/react/switch';
import { toast } from 'sonner';
import { IconCloud, IconCpu, IconPlugConnected, IconUser } from '@tabler/icons-react';
import {
  SegmentGroupRoot,
  SegmentGroupIndicator,
  SegmentGroupItem,
  SegmentGroupItemText,
  SegmentGroupItemHiddenInput,
} from '@/components/ui/segment-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';

type UserProvider = 'openai' | 'google' | 'custom';
type PlatformTransport = 'vertex_ai' | 'litellm_openai';

type MockConnection = {
  id: string;
  provider: UserProvider;
  label: string;
  model: string;
  status: 'active' | 'draft';
  updatedAt: string;
};

const MOCK_CONNECTIONS: MockConnection[] = [
  {
    id: 'conn_01',
    provider: 'openai',
    label: 'OpenAI Team Key',
    model: 'gpt-4.1-mini',
    status: 'active',
    updatedAt: '2026-02-17 13:25',
  },
  {
    id: 'conn_02',
    provider: 'custom',
    label: 'Local Model Endpoint',
    model: 'qwen2.5-32b-instruct',
    status: 'draft',
    updatedAt: '2026-02-17 11:10',
  },
];

export default function ModelRegistrationPreview() {
  const [provider, setProvider] = useState<UserProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:1234/v1');
  const [model, setModel] = useState('gpt-4.1-mini');
  const [projectOverride, setProjectOverride] = useState(false);

  const [transport, setTransport] = useState<PlatformTransport>('litellm_openai');
  const [platformBaseUrl, setPlatformBaseUrl] = useState('http://localhost:4000/v1');
  const [platformModel, setPlatformModel] = useState('claude-3-5-sonnet');
  const [platformRoutingKey, setPlatformRoutingKey] = useState('platform-default');

  const requiresBaseUrl = provider === 'custom';
  const showBaseUrl = provider === 'custom';

  const effectiveRuntime = useMemo(() => {
    if (projectOverride) {
      return {
        source: 'User connection override',
        transport: 'openai-compatible',
        endpoint: showBaseUrl ? baseUrl || '(not set)' : '(provider default)',
        model,
      };
    }
    return {
      source: 'Platform default',
      transport,
      endpoint: transport === 'litellm_openai' ? platformBaseUrl || '(not set)' : '(managed vertex runtime)',
      model: platformModel,
    };
  }, [baseUrl, model, platformBaseUrl, platformModel, projectOverride, showBaseUrl, transport]);

  const handleMockTest = () => {
    toast.info('No API call executed. This page is visual-only for UX validation.');
  };

  const handleMockSave = () => {
    toast.success('No backend write executed. Wire `user-api-keys` and runtime policy later.');
  };

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <>
      <PageHeader
        title="Model Registration Preview"
        subtitle="Visual-only dashboard for user BYO models + platform LiteLLM policy."
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconUser size={18} />
                  <h4 className="text-lg font-semibold">User Model Connection</h4>
                </div>
                <Badge variant="blue">Preview</Badge>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Provider</label>
                  <select
                    className={inputClass}
                    value={provider}
                    onChange={(e) => setProvider(e.currentTarget.value as UserProvider)}
                  >
                    <option value="openai">OpenAI Direct</option>
                    <option value="google">Google AI Studio</option>
                    <option value="custom">Custom OpenAI-compatible</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">API Key</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Paste key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.currentTarget.value)}
                  />
                </div>

                {showBaseUrl && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Base URL {requiresBaseUrl && <span className="text-destructive">*</span>}</label>
                    <span className="text-xs text-muted-foreground">Required for custom endpoints</span>
                    <input
                      type="text"
                      className={inputClass}
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.currentTarget.value)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Default Model</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={model}
                    onChange={(e) => setModel(e.currentTarget.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleMockTest}>
                    <IconPlugConnected size={16} />
                    Test Connection
                  </Button>
                  <Button onClick={handleMockSave}>
                    Save Connection
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="font-semibold">Registered Connections (Mock)</h5>
                <Badge variant="gray">Local state only</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-2 py-2 font-medium">Label</th>
                      <th className="px-2 py-2 font-medium">Provider</th>
                      <th className="px-2 py-2 font-medium">Model</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_CONNECTIONS.map((conn) => (
                      <tr key={conn.id} className="border-b transition-colors hover:bg-muted/50 even:bg-muted/20">
                        <td className="px-2 py-2">{conn.label}</td>
                        <td className="px-2 py-2"><code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{conn.provider}</code></td>
                        <td className="px-2 py-2"><code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{conn.model}</code></td>
                        <td className="px-2 py-2">
                          <Badge variant={conn.status === 'active' ? 'green' : 'gray'}>
                            {conn.status}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">{conn.updatedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-1.5">
                <IconCpu size={18} />
                <h4 className="text-lg font-semibold">Platform AI (Admin)</h4>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">Transport</span>
                <SegmentGroupRoot
                  value={transport}
                  onValueChange={(e) => setTransport((e.value as PlatformTransport) ?? 'vertex_ai')}
                >
                  <SegmentGroupIndicator />
                  {[{ label: 'Vertex', value: 'vertex_ai' }, { label: 'LiteLLM', value: 'litellm_openai' }].map((opt) => (
                    <SegmentGroupItem key={opt.value} value={opt.value}>
                      <SegmentGroupItemText>{opt.label}</SegmentGroupItemText>
                      <SegmentGroupItemHiddenInput />
                    </SegmentGroupItem>
                  ))}
                </SegmentGroupRoot>

                {transport === 'litellm_openai' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">LiteLLM Base URL</label>
                    <input type="text" className={inputClass} value={platformBaseUrl} onChange={(e) => setPlatformBaseUrl(e.currentTarget.value)} />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Platform Default Model</label>
                  <input type="text" className={inputClass} value={platformModel} onChange={(e) => setPlatformModel(e.currentTarget.value)} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Routing Policy Key</label>
                  <input type="text" className={inputClass} value={platformRoutingKey} onChange={(e) => setPlatformRoutingKey(e.currentTarget.value)} />
                </div>

                <Button variant="outline" onClick={handleMockSave}>
                  Save Platform Policy
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-1.5">
                <IconCloud size={18} />
                <h5 className="font-semibold">Effective Runtime Preview</h5>
              </div>
              <div className="flex flex-col gap-1.5">
                <Switch.Root
                  checked={projectOverride}
                  onCheckedChange={(details) => setProjectOverride(details.checked)}
                  className="inline-flex items-center gap-2"
                >
                  <Switch.HiddenInput />
                  <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                    <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
                  </Switch.Control>
                  <Switch.Label className="text-sm">Use user connection override for current project</Switch.Label>
                </Switch.Root>

                <div className="h-px bg-border" />

                <div className="rounded-md border p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm"><strong>Source:</strong> {effectiveRuntime.source}</span>
                    <span className="text-sm"><strong>Transport:</strong> <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{effectiveRuntime.transport}</code></span>
                    <span className="text-sm"><strong>Endpoint:</strong> <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{effectiveRuntime.endpoint}</code></span>
                    <span className="text-sm"><strong>Model:</strong> <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{effectiveRuntime.model}</code></span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">
                This screen is intentionally isolated from Supabase Edge Functions and DB writes.
                It is a UX prototype only.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
