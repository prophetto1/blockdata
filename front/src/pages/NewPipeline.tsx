import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Wand2,
  Upload,
  Database,
  Cpu,
  Waves,
  Blocks,
  ArrowRight,
} from 'lucide-react'

const primaryFlows = [
  {
    title: 'Generate pipeline using AI',
    description: 'Describe what you need and scaffold a pipeline automatically.',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    title: 'Start from scratch',
    description: 'Create a standard batch, integration, or streaming pipeline manually.',
    icon: Wand2,
    badge: 'Manual',
  },
]

const exampleTemplates = [
  { title: 'ETL starter pipeline', icon: Database },
  { title: 'ML model training', icon: Cpu },
  { title: 'Python + SQL workflow', icon: Blocks },
]

const featuredTemplates = [
  { title: 'Dynamic blocks', icon: Blocks },
  { title: 'Stream mode pipeline', icon: Waves },
]

export default function NewPipelinePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">New pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Choose a creation path, then continue to pipeline configuration.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/pipelines">Back to pipelines</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {primaryFlows.map((flow) => (
          <Card key={flow.title} className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <flow.icon className="h-4 w-4" />
                  {flow.title}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {flow.badge}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{flow.description}</p>
              <Button size="sm" variant="outline" className="w-full justify-between">
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Example templates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {exampleTemplates.map((template) => (
            <Button
              key={template.title}
              variant="outline"
              className="h-10 justify-start gap-2 text-left text-xs"
            >
              <template.icon className="h-3.5 w-3.5 shrink-0" />
              {template.title}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Featured templates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {featuredTemplates.map((template) => (
            <Button
              key={template.title}
              variant="outline"
              className="h-10 justify-start gap-2 text-left text-xs"
            >
              <template.icon className="h-3.5 w-3.5 shrink-0" />
              {template.title}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Upload/import pipeline</p>
            <p className="text-xs text-muted-foreground">
              Bring an existing pipeline into this workspace from a zip archive.
            </p>
          </div>
          <Button size="sm" variant="outline">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload pipeline zip
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
