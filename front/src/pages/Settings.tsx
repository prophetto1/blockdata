import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Key, Shield } from 'lucide-react'

const sections = [
  { title: 'General', icon: User, desc: 'Workspace profile and defaults.' },
  { title: 'API Keys', icon: Key, desc: 'Provider keys and model defaults.' },
  { title: 'Admin', icon: Shield, desc: 'Superuser configuration surface.' },
]

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Settings</h1>

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