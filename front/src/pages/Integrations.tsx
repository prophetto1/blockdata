import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Plug, Terminal } from 'lucide-react'

const sections = [
  { title: 'Agents', icon: Bot, desc: 'Configured model and assistant providers.' },
  { title: 'MCP Servers', icon: Plug, desc: 'Connector and tool registry.' },
  { title: 'Commands', icon: Terminal, desc: 'Automation command definitions.' },
]

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Integrations</h1>

      <div className="grid grid-cols-3 gap-3">
        {sections.map((s) => (
          <Card key={s.title} className="cursor-pointer transition-colors hover:border-foreground/20">
            <CardHeader className="pb-2">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-sm">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}