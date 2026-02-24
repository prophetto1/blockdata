import FlowCanvas from '@/shell/FlowCanvas'

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <header className="flex items-center justify-between border border-slate-200 bg-white px-4 py-2">
        <h1 className="text-sm font-semibold text-slate-900">Workflow Canvas</h1>
        <p className="text-xs text-slate-500">React Flow only</p>
      </header>
      <section className="h-[calc(100vh-110px)] border border-slate-200 bg-white">
        <FlowCanvas />
      </section>
    </main>
  )
}
