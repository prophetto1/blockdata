import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';

const HEADER_TILES = [
  { label: 'ACTIVE', value: '14', note: 'running', accent: 'text-emerald-300' },
  { label: 'OVERDUE', value: '2', note: '> lease', accent: 'text-amber-300' },
  { label: 'STALE', value: '5', note: 'no hb', accent: 'text-slate-200' },
  { label: 'FAILED-RELEASE', value: '0', note: 'stuck', accent: 'text-rose-300' },
] as const;

const IDENTITY_ROWS = [
  {
    identity: 'agent:cc-jon',
    workspace: 'wrk-7d3',
    state: 'active',
    stateTone: 'bg-emerald-400',
    lease: 'L-aa81',
    updatedAt: '14:02',
    age: '1m ago',
    surface: 'VS Code / CC',
  },
  {
    identity: 'agent:cdx-bud',
    workspace: 'wrk-812',
    state: 'active',
    stateTone: 'bg-emerald-400',
    lease: 'L-bc12',
    updatedAt: '14:01',
    age: '2m ago',
    surface: 'Codex App / CDX',
  },
  {
    identity: 'agent:cc-bud',
    workspace: 'wrk-2f8',
    state: 'failed-release',
    stateTone: 'bg-rose-400',
    lease: 'L-d421',
    updatedAt: '13:58',
    age: '1h ago',
    surface: 'Terminal / CC',
  },
  {
    identity: 'agent:cdx-jon',
    workspace: 'wrk-5c1',
    state: 'overdue',
    stateTone: 'bg-amber-400',
    lease: 'L-f8d0',
    updatedAt: '13:22',
    age: '40m ago',
    surface: 'VS Code / CDX',
  },
] as const;

const DISCUSSIONS = [
  { title: 'plan:2026-04-14-header', unread: '2 unread', summary: 'Waiting on tile contract decision' },
  { title: 'task:cdx-bud/42', unread: '1 unread', summary: 'Force-release requested after stale lease' },
] as const;

const EVENTS = [
  '14:03 broker.connected bridge resumed after 1.2s reconnect',
  '14:02 lease.heartbeat agent:cc-jon wrk-7d3 revision v4',
  '14:01 release.failed agent:cc-bud wrk-2f8 exceeded lease window',
] as const;

function MockTile({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className={`text-4xl font-semibold tracking-tight ${accent}`}>{value}</p>
        <p className="pb-1 text-xs uppercase tracking-[0.2em] text-slate-500">{note}</p>
      </div>
    </div>
  );
}

export function Component() {
  useShellHeaderTitle({
    title: 'Coordination Runtime Mock',
    breadcrumbs: ['Superuser', 'Coordination Runtime Mock'],
  });

  return (
    <WorkbenchPage
      eyebrow="Superuser mock design page"
      title="Coordination Runtime Mock"
      description="Static operator-style mock for fast iteration on the ranked header band, identity workbench, inspector, and collapsed live feed before anyone rewires the real runtime surface."
      hideHeader
      contentClassName="gap-4 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.10),_transparent_28%)]"
    >
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline">
          Refresh
        </Button>
        <Button type="button" size="sm" variant="outline">
          Pause live
        </Button>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="border-b border-slate-800/90 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                healthy
              </span>
              <span>broker connected</span>
              <span>bridge live</span>
              <span>stream ok</span>
            </div>
            <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200">
              mock data only
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-3 xl:grid-cols-4">
            {HEADER_TILES.map((tile) => (
              <MockTile key={tile.label} {...tile} />
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Type</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Status</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Age</span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">failed-release visible</span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              Search identities
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_320px]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/85">
                <div className="border-b border-slate-800 px-4 py-3">
                  <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">IDENTITIES</h2>
                </div>
                <div className="divide-y divide-slate-800">
                  {IDENTITY_ROWS.map((row) => (
                    <div
                      key={`${row.identity}-${row.workspace}`}
                      className="grid gap-3 px-4 py-3 text-sm text-slate-200 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_110px_88px]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${row.stateTone}`} />
                          <p className="truncate font-medium">{row.identity}</p>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            {row.state}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.workspace} - {row.surface}
                        </p>
                      </div>
                      <div className="text-xs text-slate-400">
                        <p className="uppercase tracking-[0.18em] text-slate-500">lease</p>
                        <p className="mt-1 text-slate-200">{row.lease}</p>
                      </div>
                      <div className="text-xs text-slate-400">
                        <p className="uppercase tracking-[0.18em] text-slate-500">updated</p>
                        <p className="mt-1 text-slate-200">{row.updatedAt}</p>
                      </div>
                      <div className="text-xs text-slate-400">
                        <p className="uppercase tracking-[0.18em] text-slate-500">age</p>
                        <p className="mt-1 text-slate-200">{row.age}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950/85">
                <div className="border-b border-slate-800 px-4 py-3">
                  <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">DISCUSSION QUEUE</h2>
                </div>
                <div className="space-y-3 px-4 py-4">
                  {DISCUSSIONS.map((discussion) => (
                    <div key={discussion.title} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-100">{discussion.title}</p>
                        <span className="text-xs text-sky-200">{discussion.unread}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{discussion.summary}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rounded-2xl border border-slate-800 bg-slate-950/90">
              <div className="border-b border-slate-800 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">INSPECTOR</h2>
              </div>
              <div className="space-y-4 px-4 py-4 text-sm text-slate-200">
                <div>
                  <p className="font-medium text-slate-100">agent:cc-jon / wrk-7d3</p>
                  <p className="mt-1 text-xs text-slate-500">Selected identity workspace</p>
                </div>

                <dl className="space-y-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Connection</dt>
                    <dd className="mt-1 text-slate-100">active</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Surface</dt>
                    <dd className="mt-1 text-slate-100">vscode / CC</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Runtime</dt>
                    <dd className="mt-1 text-slate-100">node-20</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lease id</dt>
                    <dd className="mt-1 text-slate-100">L-aa81</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Revision</dt>
                    <dd className="mt-1 text-slate-100">v4</dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200">Release</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary">
                      Force release
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-slate-200 hover:text-slate-100">
                      Review events
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/75">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">Live events</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                collapsed
              </span>
            </div>
            <div className="space-y-2 px-4 py-4 text-xs text-slate-400">
              {EVENTS.map((event) => (
                <p key={event} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                  {event}
                </p>
              ))}
            </div>
          </section>
        </div>
      </section>
    </WorkbenchPage>
  );
}
