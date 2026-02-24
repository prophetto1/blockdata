import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Plus } from 'lucide-react'

const blockCategories = [
  'All templates',
  'Data loader',
  'Transformer',
  'Data exporter',
  'Sensor',
  'Custom',
  'Chart',
  'Callback',
  'Conditional',
  'Extension',
  'dbt',
  'Markdown',
]

const pipelineCategories = ['All templates', 'Standard', 'Data integration', 'Streaming']

export default function SchemasPage() {
  const [mode, setMode] = useState<'browse' | 'new'>('browse')
  const [tab, setTab] = useState<'blocks' | 'pipelines'>('blocks')
  const [selectedCategory, setSelectedCategory] = useState('All templates')

  const categories = useMemo(
    () => (tab === 'blocks' ? blockCategories : pipelineCategories),
    [tab],
  )

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Templates</h1>
      </div>

      {mode === 'browse' && (
        <Card>
          <CardContent className="space-y-4 p-3">
            <div className="flex items-center gap-2">
              <Tabs
                value={tab}
                onValueChange={(value) => {
                  const next = value as 'blocks' | 'pipelines'
                  setTab(next)
                  setSelectedCategory('All templates')
                }}
              >
                <TabsList className="h-9">
                  <TabsTrigger value="blocks" className="px-4 text-xs">
                    BLOCKS
                  </TabsTrigger>
                  <TabsTrigger value="pipelines" className="px-4 text-xs">
                    PIPELINES
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button size="sm" onClick={() => setMode('new')}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {tab === 'blocks' ? 'New block template' : 'New pipeline template'}
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-0 rounded-sm border border-border/80">
              <aside className="col-span-3 border-r border-border/80">
                <div className="space-y-0.5 p-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`flex w-full items-center rounded-sm px-3 py-2 text-left text-sm ${
                        selectedCategory === category
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </aside>

              <section className="col-span-9 min-h-[26rem] p-3">
                <p className="text-sm text-muted-foreground">
                  There are currently no templates matching your search.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Add a new template by clicking the button above.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'new' && (
        <Card>
          <CardContent className="grid min-h-[26rem] grid-cols-12 gap-0 p-0">
            <aside className="col-span-4 border-r border-border/80 p-3">
              <Button size="sm" variant="outline" className="mb-4">
                DEFINE
              </Button>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Template UUID</p>
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for custom template storage.
                  </p>
                  <Input placeholder="e.g. some_template_name" />
                </div>

                <select
                  defaultValue="data_loader"
                  className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm"
                >
                  <option value="data_loader">Data loader</option>
                  <option value="transformer">Transformer</option>
                  <option value="data_exporter">Data exporter</option>
                  <option value="sensor">Sensor</option>
                </select>

                <select
                  defaultValue="python"
                  className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm"
                >
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="yaml">YAML</option>
                </select>

                <Separator />

                <Button className="w-full" variant="outline">
                  Create new template
                </Button>
                <Button className="w-full" variant="ghost" onClick={() => setMode('browse')}>
                  Back to templates
                </Button>
              </div>
            </aside>

            <section className="col-span-8 bg-background" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
