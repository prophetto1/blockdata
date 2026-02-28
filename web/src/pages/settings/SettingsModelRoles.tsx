import { useCallback, useEffect, useState } from 'react';
import { IconCheck, IconGripVertical, IconTrash } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { SettingsPageFrame, SettingsSection } from './SettingsPageHeader';

type RoleCatalogRow = {
  role_key: string;
  display_name: string;
  description: string | null;
  allows_multiple: boolean;
};

type RoleAssignmentRow = {
  id: string;
  role_key: string;
  provider: string;
  model_id: string;
  priority: number;
  config_jsonb: Record<string, unknown>;
  is_active: boolean;
};

export default function SettingsModelRoles() {
  const [roles, setRoles] = useState<RoleCatalogRow[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    const [{ data: roleData }, { data: assignData }] = await Promise.all([
      supabase.from('model_role_catalog').select('*').order('role_key'),
      supabase.from('model_role_assignments').select('*').order('role_key').order('priority'),
    ]);
    if (roleData) setRoles(roleData as RoleCatalogRow[]);
    if (assignData) setAssignments(assignData as RoleAssignmentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentsForRole = (roleKey: string) =>
    assignments.filter((a) => a.role_key === roleKey);

  const toggleActive = async (assignment: RoleAssignmentRow) => {
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .from('model_role_assignments')
      .update({ is_active: !assignment.is_active, updated_at: new Date().toISOString() })
      .eq('id', assignment.id);

    if (error) {
      setStatus({ kind: 'error', message: error.message });
    } else {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignment.id ? { ...a, is_active: !a.is_active } : a)),
      );
    }
    setSaving(false);
  };

  const removeAssignment = async (id: string) => {
    setSaving(true);
    setStatus(null);
    const { error } = await supabase.from('model_role_assignments').delete().eq('id', id);
    if (error) {
      setStatus({ kind: 'error', message: error.message });
    } else {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <SettingsPageFrame
      title="Model Roles"
      description="Assign AI models to operational roles. Each role determines which model is used for that function."
    >
      {status && (
        <div
          className={cn(
            'mb-3 rounded-md border px-3 py-2 text-sm',
            status.kind === 'error'
              ? 'border-red-300/60 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-950/20 dark:text-red-400'
              : 'border-green-300/60 bg-green-50 text-green-700 dark:border-green-700/40 dark:bg-green-950/20 dark:text-green-400',
          )}
          role="status"
        >
          {status.message}
        </div>
      )}

      <div className="space-y-6">
        {roles.map((role) => {
          const roleAssignments = assignmentsForRole(role.role_key);
          return (
            <SettingsSection
              key={role.role_key}
              title={role.display_name}
              description={role.description ?? undefined}
            >
              {roleAssignments.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No models assigned</p>
              ) : (
                <div className="space-y-2">
                  {roleAssignments.map((assignment, idx) => (
                    <div
                      key={assignment.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5',
                        assignment.is_active
                          ? 'border-green-300/40 dark:border-green-700/30'
                          : 'border-border opacity-60',
                      )}
                    >
                      <span className="text-muted-foreground">
                        <IconGripVertical size={14} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {assignment.provider}
                          </span>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {assignment.model_id}
                          </span>
                        </div>
                      </div>

                      {idx === 0 && roleAssignments.length > 1 && (
                        <Badge variant="outline" className="text-[10px]">
                          Primary
                        </Badge>
                      )}
                      {idx > 0 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Fallback
                        </Badge>
                      )}

                      <button
                        type="button"
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded text-xs transition-colors',
                          assignment.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                            : 'bg-muted text-muted-foreground',
                        )}
                        title={assignment.is_active ? 'Active — click to disable' : 'Disabled — click to enable'}
                        onClick={() => toggleActive(assignment)}
                        disabled={saving}
                      >
                        {assignment.is_active && <IconCheck size={14} />}
                      </button>

                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Remove assignment"
                        onClick={() => removeAssignment(assignment.id)}
                        disabled={saving}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SettingsSection>
          );
        })}
      </div>
    </SettingsPageFrame>
  );
}
