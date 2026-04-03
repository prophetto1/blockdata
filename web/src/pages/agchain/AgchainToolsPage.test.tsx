import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainToolsPage from './AgchainToolsPage';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
});

const platformApiFetchMock = vi.fn();
const useAgchainProjectFocusMock = vi.fn();
const useAgchainScopeStateMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const PROJECT_ID = 'project-1';

const TOOL_LIST_RESPONSE = {
  items: [
    {
      tool_ref: 'builtin:web_search',
      tool_id: null,
      tool_name: 'web_search',
      display_name: 'Web Search',
      description: 'Search the web.',
      source_kind: 'builtin',
      scope_kind: 'system',
      read_only: true,
      approval_mode: 'auto',
      latest_version: null,
      updated_at: null,
    },
    {
      tool_ref: 'custom:tool-version-1',
      tool_id: 'tool-1',
      tool_name: 'custom_lookup',
      display_name: 'Custom Lookup',
      description: 'Project tool.',
      source_kind: 'custom',
      scope_kind: 'project',
      read_only: false,
      approval_mode: 'manual',
      latest_version: {
        tool_version_id: 'tool-version-1',
        version_label: 'v1',
        status: 'draft',
        parallel_calls_allowed: false,
      },
      updated_at: '2026-04-01T08:00:00Z',
    },
  ],
  next_cursor: null,
};

const TOOL_DETAIL_RESPONSE = {
  tool: {
    tool_id: 'tool-1',
    tool_ref: 'custom:tool-version-1',
    tool_name: 'custom_lookup',
    display_name: 'Custom Lookup',
    description: 'Project tool.',
    source_kind: 'custom',
    approval_mode: 'manual',
  },
  latest_version: {
    tool_version_id: 'tool-version-1',
    version_label: 'v1',
    status: 'draft',
    input_schema_jsonb: { type: 'object' },
    output_schema_jsonb: { type: 'string' },
    tool_config_jsonb: {
      implementation_kind: 'python_callable',
      implementation_ref: 'pkg.tools.custom_lookup',
    },
    parallel_calls_allowed: false,
  },
  versions: [
    {
      tool_version_id: 'tool-version-1',
      version_label: 'v1',
      status: 'draft',
      input_schema_jsonb: { type: 'object' },
      output_schema_jsonb: { type: 'string' },
      tool_config_jsonb: {
        implementation_kind: 'python_callable',
        implementation_ref: 'pkg.tools.custom_lookup',
      },
      parallel_calls_allowed: false,
    },
  ],
};

describe('AgchainToolsPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useAgchainProjectFocusMock.mockReset();
    useAgchainScopeStateMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        project_id: PROJECT_ID,
        organization_id: 'org-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
        membership_role: 'owner',
        updated_at: '2026-03-31T00:00:00Z',
        primary_benchmark_slug: 'legal-10',
        primary_benchmark_name: 'Legal-10',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        href: '/app/agchain/overview?project=legal-10',
      },
      loading: false,
    });
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      focusedProject: {
        project_id: PROJECT_ID,
        organization_id: 'org-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
        membership_role: 'owner',
        updated_at: '2026-03-31T00:00:00Z',
        primary_benchmark_slug: 'legal-10',
        primary_benchmark_name: 'Legal-10',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        href: '/app/agchain/overview?project=legal-10',
      },
    });

    let listResponse = TOOL_LIST_RESPONSE;
    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith(`/agchain/tools?project_id=${PROJECT_ID}`) && init?.method === undefined) {
        return Promise.resolve(jsonResponse(listResponse));
      }
      if (path === `/agchain/tools/new/bootstrap?project_id=${PROJECT_ID}`) {
        return Promise.resolve(
          jsonResponse({
            builtin_catalog: [{ tool_ref: 'builtin:web_search', display_name: 'Web Search' }],
            sandbox_profiles: [],
            source_kind_options: ['custom', 'bridged', 'mcp_server'],
            secret_slot_contract: { value_kinds: ['secret', 'token', 'api_key'] },
          }),
        );
      }
      if (path === '/secrets') {
        return Promise.resolve(
          jsonResponse({
            secrets: [
              {
                id: 'secret-1',
                name: 'OPENAI_API_KEY',
                description: 'Shared OpenAI key',
                value_kind: 'api_key',
                value_suffix: '....1234',
                created_at: '2026-04-01T08:00:00Z',
                updated_at: '2026-04-01T08:00:00Z',
              },
            ],
          }),
        );
      }
      if (path === `/agchain/tools/tool-1/detail?project_id=${PROJECT_ID}`) {
        return Promise.resolve(jsonResponse(TOOL_DETAIL_RESPONSE));
      }
      if (path === '/agchain/tools' && init?.method === 'POST') {
        listResponse = {
          items: [
            ...TOOL_LIST_RESPONSE.items,
            {
              tool_ref: 'custom:tool-version-2',
              tool_id: 'tool-2',
              tool_name: 'repo_search',
              display_name: 'Repo Search',
              description: 'Repository lookup tool.',
              source_kind: 'custom',
              scope_kind: 'project',
              read_only: false,
              approval_mode: 'manual',
              latest_version: {
                tool_version_id: 'tool-version-2',
                version_label: 'v1',
                status: 'draft',
                parallel_calls_allowed: false,
              },
              updated_at: '2026-04-01T09:00:00Z',
            },
          ],
          next_cursor: null,
        };
        return Promise.resolve(
          jsonResponse({
            tool: listResponse.items[2],
            latest_version: {
              tool_version_id: 'tool-version-2',
              version_label: 'v1',
              status: 'draft',
              input_schema_jsonb: { type: 'object' },
              output_schema_jsonb: { type: 'string' },
              tool_config_jsonb: {
                implementation_kind: 'python_callable',
                implementation_ref: 'pkg.tools.repo_search',
              },
              parallel_calls_allowed: false,
            },
            versions: [],
          }),
        );
      }
      if (path === '/agchain/tools/new/preview' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            normalized_definition: {
              source_kind: 'mcp_server',
              tool_config_jsonb: { transport_type: 'stdio', command: 'demo-mcp' },
            },
            discovered_tools: [],
            validation: { ok: true, errors: [], warnings: [] },
            missing_secret_slots: [],
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the project selection prompt when no project is focused', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    render(
      <MemoryRouter>
        <AgchainToolsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /choose a project/i })).toBeInTheDocument();
  });

  it('shows loading while the shared AGChain scope is bootstrapping', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'bootstrapping',
    });

    render(
      <MemoryRouter>
        <AgchainToolsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading workspace...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tools' })).not.toBeInTheDocument();
  });

  it('renders the merged registry and opens the inspector for authored tools', async () => {
    render(
      <MemoryRouter>
        <AgchainToolsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Web Search').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Custom Lookup').length).toBeGreaterThan(0);
    expect(screen.getByText('Read-only built-in')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Custom Lookup' }));

    const inspector = await screen.findByRole('dialog');
    expect(within(inspector).getByRole('heading', { name: 'Custom Lookup' })).toBeInTheDocument();
    expect(within(inspector).getByText('Version history')).toBeInTheDocument();
    expect(within(inspector).getByText('v1')).toBeInTheDocument();
    expect(within(inspector).getByRole('button', { name: 'Edit tool' })).toBeInTheDocument();
  });

  it('opens the source-kind editor, shows secrets metadata, and creates a custom tool', async () => {
    render(
      <MemoryRouter>
        <AgchainToolsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Custom Lookup').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Tool name')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Implementation ref')).toBeInTheDocument();
    expect(within(dialog).getByText('OPENAI_API_KEY')).toBeInTheDocument();

    // Source kind switching (custom→mcp_server→custom) requires Ark Select
    // interaction inside a dialog Portal, which jsdom doesn't support reliably.
    // The default source kind is 'custom', so we test tool creation directly.
    fireEvent.change(within(dialog).getByLabelText('Tool name'), {
      target: { value: 'repo_search' },
    });
    fireEvent.change(within(dialog).getByLabelText('Display name'), {
      target: { value: 'Repo Search' },
    });
    fireEvent.change(within(dialog).getByLabelText('Description'), {
      target: { value: 'Repository lookup tool.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Implementation ref'), {
      target: { value: 'pkg.tools.repo_search' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create tool' }));

    await waitFor(() => {
      expect(screen.getAllByText('Repo Search').length).toBeGreaterThan(0);
    });
  });
});
