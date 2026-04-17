import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgchainOrganizationRow } from '@/lib/agchainWorkspaces';
import { fetchAgchainOrganizations } from '@/lib/agchainWorkspaces';
import {
  readStoredAgchainOrganizationFocusId,
  writeStoredAgchainWorkspaceFocus,
} from '@/lib/agchainProjectFocus';

export type AgchainOrganizationScopeState =
  | { kind: 'bootstrapping' }
  | { kind: 'error'; reload: () => Promise<void> }
  | { kind: 'no-organization'; reload: () => Promise<void> }
  | {
      kind: 'ready';
      organizations: AgchainOrganizationRow[];
      selectedOrganization: AgchainOrganizationRow;
      selectedOrganizationId: string;
      reload: () => Promise<void>;
    };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function resolveSelectedOrganization(
  organizations: AgchainOrganizationRow[],
  preferredOrganizationId: string | null,
): AgchainOrganizationRow | null {
  if (!organizations.length) {
    return null;
  }

  if (preferredOrganizationId) {
    const preferred = organizations.find(
      (organization) => organization.organization_id === preferredOrganizationId,
    );
    if (preferred) {
      return preferred;
    }
  }

  return organizations[0] ?? null;
}

type InternalState =
  | { kind: 'bootstrapping' }
  | { kind: 'error'; error: string }
  | { kind: 'no-organization' }
  | {
      kind: 'ready';
      organizations: AgchainOrganizationRow[];
      selectedOrganization: AgchainOrganizationRow;
    };

export function useAgchainOrganizationScopeState(): AgchainOrganizationScopeState {
  const requestIdRef = useRef(0);
  const [state, setState] = useState<InternalState>({ kind: 'bootstrapping' });

  const loadOrganizations = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setState((current) => (current.kind === 'ready' ? current : { kind: 'bootstrapping' }));

    try {
      const result = await fetchAgchainOrganizations();
      if (requestIdRef.current !== requestId) {
        return;
      }

      const selectedOrganization = resolveSelectedOrganization(
        result.items,
        readStoredAgchainOrganizationFocusId(),
      );

      if (!selectedOrganization) {
        setState({ kind: 'no-organization' });
        return;
      }

      writeStoredAgchainWorkspaceFocus({
        focusedOrganizationId: selectedOrganization.organization_id,
      });

      setState({
        kind: 'ready',
        organizations: result.items,
        selectedOrganization,
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setState({
        kind: 'error',
        error: getErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  if (state.kind === 'bootstrapping') {
    return state;
  }

  if (state.kind === 'error') {
    return {
      kind: 'error',
      reload: loadOrganizations,
    };
  }

  if (state.kind === 'no-organization') {
    return {
      kind: 'no-organization',
      reload: loadOrganizations,
    };
  }

  return {
    kind: 'ready',
    organizations: state.organizations,
    selectedOrganization: state.selectedOrganization,
    selectedOrganizationId: state.selectedOrganization.organization_id,
    reload: loadOrganizations,
  };
}
