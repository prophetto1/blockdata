import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as agchainBenchmarkContracts from '@/lib/agchainBenchmarks';
import type { AgchainToolRegistryRow } from '@/lib/agchainTools';
import type {
  AgchainBenchmarkDetail,
  AgchainBenchmarkRegistryRow,
  AgchainBenchmarkWorkbenchDetail,
} from '@/lib/agchainBenchmarks';
import AgchainBenchmarksPage from './AgchainBenchmarksPage';

const useAgchainBenchmarkStepsMock = vi.fn();
const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainBenchmarkSteps', () => ({
  useAgchainBenchmarkSteps: () => useAgchainBenchmarkStepsMock(),
}));

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

const PROJECT_ROW: AgchainBenchmarkRegistryRow & {
  project_id: string;
  project_slug: string;
  project_name: string;
} = {
  project_id: 'project-1',
  project_slug: 'legal-evals',
  project_name: 'Legal Evals',
  benchmark_id: 'benchmark-1',
  benchmark_slug: 'legal-10',
  benchmark_name: 'Legal-10',
  description: 'Three-step benchmark package for legal analysis.',
  state: 'draft',
  current_spec_label: 'v0.1.0',
  current_spec_version: 'v0.1.0',
  version_status: 'draft',
  step_count: 2,
  selected_eval_model_count: 2,
  tested_model_count: 1,
  tested_policy_bundle_count: 0,
  validation_status: 'warn',
  validation_issue_count: 2,
  last_run_at: null,
  updated_at: '2026-03-31T16:45:00Z',
  href: '/app/agchain/overview?project=legal-10',
};

const BENCHMARK_DETAIL: AgchainBenchmarkDetail = {
  benchmark: {
    benchmark_id: 'benchmark-1',
    benchmark_slug: 'legal-10',
    benchmark_name: 'Legal-10',
    description: 'Three-step benchmark package for legal analysis.',
    tags: ['legal', 'phase-1'],
    latest_version_id: 'version-1',
    latest_version_label: 'v0.1.0',
    status: 'draft',
    validation_status: 'warn',
    updated_at: '2026-03-31T16:45:00Z',
  },
  current_draft_version: {
    benchmark_version_id: 'version-1',
    version_label: 'v0.1.0',
    version_status: 'draft',
    dataset_version_id: 'dataset-version-1',
    validation_status: 'warn',
    scorer_count: 1,
    tool_count: 0,
    created_at: '2026-03-31T16:45:00Z',
    updated_at: '2026-03-31T16:45:00Z',
  },
  current_published_version: null,
  recent_runs_count: 0,
};

const WORKBENCH_DETAIL: AgchainBenchmarkWorkbenchDetail = {
  benchmark: {
    benchmark_id: 'benchmark-1',
    benchmark_slug: 'legal-10',
    benchmark_name: 'Legal-10',
    description: 'Three-step benchmark package for legal analysis.',
  },
  current_version: {
    benchmark_version_id: 'version-1',
    version_label: 'v0.1.0',
    version_status: 'draft',
    plan_family: 'custom',
    step_count: 2,
    validation_status: 'warn',
    validation_issue_count: 2,
  },
  permissions: {
    can_edit: true,
  },
  counts: {
    selected_eval_model_count: 2,
    tested_model_count: 1,
  },
};

const AVAILABLE_TOOLS: AgchainToolRegistryRow[] = [
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
      status: 'published',
      parallel_calls_allowed: false,
    },
    updated_at: '2026-04-01T09:00:00Z',
  },
];

afterEach(() => {
  cleanup();
});

describe('AgchainBenchmarksPage', () => {
  beforeEach(() => {
    useAgchainScopeStateMock.mockReset();
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      focusedProject: PROJECT_ROW,
    });
    useAgchainBenchmarkStepsMock.mockReset();
    useAgchainBenchmarkStepsMock.mockReturnValue({
      benchmark: WORKBENCH_DETAIL.benchmark,
      currentVersion: WORKBENCH_DETAIL.current_version,
      counts: WORKBENCH_DETAIL.counts,
      steps: [
        {
          benchmark_step_id: 'step-1',
          step_order: 1,
          step_id: 'd1',
          display_name: 'Issue Spotting',
          step_kind: 'model',
          api_call_boundary: 'own_call',
          inject_payloads: ['p1'],
          scoring_mode: 'none',
          output_contract: 'irac_outline_v1',
          scorer_ref: null,
          judge_prompt_ref: null,
          judge_grades_step_ids: [],
          enabled: true,
          step_config: { system_prompt_ref: 'issue_spotting_v1' },
          updated_at: '2026-03-27T08:15:00Z',
        },
      ],
      selectedStepId: 'step-1',
      selectedStep: {
        benchmark_step_id: 'step-1',
        step_order: 1,
        step_id: 'd1',
        display_name: 'Issue Spotting',
        step_kind: 'model',
        api_call_boundary: 'own_call',
        inject_payloads: ['p1'],
        scoring_mode: 'none',
        output_contract: 'irac_outline_v1',
        scorer_ref: null,
        judge_prompt_ref: null,
        judge_grades_step_ids: [],
        enabled: true,
        step_config: { system_prompt_ref: 'issue_spotting_v1' },
        updated_at: '2026-03-27T08:15:00Z',
      },
      canEdit: true,
      loading: false,
      mutating: false,
      error: null,
      dirtyOrder: false,
      toolRefs: [
        {
          position: 1,
          tool_ref: 'builtin:web_search',
          source_kind: 'builtin',
          tool_version_id: null,
          alias: null,
          config_overrides_jsonb: {},
          display_name: 'Web Search',
        },
      ],
      resolvedTools: [
        {
          position: 1,
          tool_ref: 'builtin:web_search',
          source_kind: 'builtin',
          tool_version_id: null,
          alias: null,
          display_name: 'Web Search',
          runtime_name: 'web_search',
          approval_mode: 'auto',
          parallel_calls_allowed: false,
          input_schema_jsonb: {},
          output_schema_jsonb: {},
          config_overrides_jsonb: {},
          missing_secret_slots: [],
          resolution_status: 'resolved',
        },
      ],
      availableTools: AVAILABLE_TOOLS,
      dirtyToolBag: false,
      selectStep: vi.fn(),
      moveStep: vi.fn(),
      saveOrder: vi.fn(),
      createStep: vi.fn(),
      updateSelectedStep: vi.fn(),
      deleteSelectedStep: vi.fn(),
      addToolRef: vi.fn(),
      updateToolRef: vi.fn(),
      moveToolRef: vi.fn(),
      removeToolRef: vi.fn(),
      saveToolBag: vi.fn(),
      focusedProject: PROJECT_ROW,
      hasProjectFocus: true,
    });
  });

  it('renders benchmark definition as a selected-project child page rather than a multi-project registry', () => {
    expect(agchainBenchmarkContracts).toBeTypeOf('object');
    expect(PROJECT_ROW.benchmark_slug).toBe('legal-10');
    expect(PROJECT_ROW.project_slug).toBe('legal-evals');
    expect(BENCHMARK_DETAIL.current_draft_version?.dataset_version_id).toBe('dataset-version-1');
    expect(WORKBENCH_DETAIL.current_version?.step_count).toBe(2);

    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Benchmark definition' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Steps' })).toBeInTheDocument();
    expect(screen.getByText(/legal evals owns this benchmark definition page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Step' })).toBeInTheDocument();
    expect(screen.getByText('Issue Spotting')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tool Bag' })).toBeInTheDocument();
    expect(screen.getAllByText('Web Search').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Save Tool Bag' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'New Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Benchmark' })).not.toBeInTheDocument();
  });

  it('wires the tool bag controls through the benchmark workbench hook', () => {
    const addToolRef = vi.fn();
    const saveToolBag = vi.fn();
    const updateToolRef = vi.fn();

    useAgchainBenchmarkStepsMock.mockReturnValue({
      benchmark: WORKBENCH_DETAIL.benchmark,
      currentVersion: WORKBENCH_DETAIL.current_version,
      counts: WORKBENCH_DETAIL.counts,
      steps: [],
      selectedStepId: null,
      selectedStep: null,
      canEdit: true,
      loading: false,
      mutating: false,
      error: null,
      dirtyOrder: false,
      toolRefs: [
        {
          position: 1,
          tool_ref: 'builtin:web_search',
          source_kind: 'builtin',
          tool_version_id: null,
          alias: null,
          config_overrides_jsonb: {},
          display_name: 'Web Search',
        },
      ],
      resolvedTools: [
        {
          position: 1,
          tool_ref: 'builtin:web_search',
          source_kind: 'builtin',
          tool_version_id: null,
          alias: null,
          display_name: 'Web Search',
          runtime_name: 'web_search',
          approval_mode: 'auto',
          parallel_calls_allowed: false,
          input_schema_jsonb: {},
          output_schema_jsonb: {},
          config_overrides_jsonb: {},
          missing_secret_slots: [],
          resolution_status: 'resolved',
        },
      ],
      availableTools: AVAILABLE_TOOLS,
      dirtyToolBag: true,
      selectStep: vi.fn(),
      moveStep: vi.fn(),
      saveOrder: vi.fn(),
      createStep: vi.fn(),
      updateSelectedStep: vi.fn(),
      deleteSelectedStep: vi.fn(),
      addToolRef,
      updateToolRef,
      moveToolRef: vi.fn(),
      removeToolRef: vi.fn(),
      saveToolBag,
      focusedProject: PROJECT_ROW,
      hasProjectFocus: true,
    });

    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    expect(addToolRef).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Alias'), {
      target: { value: 'primary_tool' },
    });
    expect(updateToolRef).toHaveBeenCalledWith(1, { alias: 'primary_tool' });

    fireEvent.click(screen.getByRole('button', { name: 'Save Tool Bag' }));
    expect(saveToolBag).toHaveBeenCalledTimes(1);
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });
    useAgchainBenchmarkStepsMock.mockReturnValue({
      benchmark: null,
      currentVersion: null,
      counts: { selected_eval_model_count: 0, tested_model_count: 0 },
      steps: [],
      selectedStepId: null,
      selectedStep: null,
      canEdit: false,
      loading: false,
      mutating: false,
      error: null,
      dirtyOrder: false,
      toolRefs: [],
      resolvedTools: [],
      availableTools: [],
      dirtyToolBag: false,
      selectStep: vi.fn(),
      moveStep: vi.fn(),
      saveOrder: vi.fn(),
      createStep: vi.fn(),
      updateSelectedStep: vi.fn(),
      deleteSelectedStep: vi.fn(),
      addToolRef: vi.fn(),
      updateToolRef: vi.fn(),
      moveToolRef: vi.fn(),
      removeToolRef: vi.fn(),
      saveToolBag: vi.fn(),
      focusedProject: null,
      hasProjectFocus: false,
    });

    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
