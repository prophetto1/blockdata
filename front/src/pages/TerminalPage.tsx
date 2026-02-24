import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Line = {
  kind: 'input' | 'output'
  value: string
}

const INITIAL_LINES: Line[] = [
  { kind: 'output', value: 'Connected to terminal session.' },
  { kind: 'output', value: 'Type a command and press Enter.' },
]

function runCommand(command: string): string {
  const cmd = command.trim().toLowerCase()
  if (cmd === 'pwd') {
    return '/home/src/default_repo'
  }
  if (cmd === 'ls') {
    return 'pipelines  templates  blocks  configs'
  }
  if (cmd === 'git status') {
    return 'On branch feature/templates-v2\\nChanges not staged for commit.'
  }
  if (!cmd.length) {
    return ''
  }
  return `Command not found: ${command}`
}

export default function TerminalPage() {
  const [lines, setLines] = useState<Line[]>(INITIAL_LINES)
  const [command, setCommand] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = command.trim()
    if (!value.length) {
      return
    }

    const result = runCommand(value)
    setLines((current) => [
      ...current,
      { kind: 'input', value: `$ ${value}` },
      ...(result.length ? [{ kind: 'output' as const, value: result }] : []),
    ])
    setCommand('')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Terminal</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setLines(INITIAL_LINES)}>
          Clear
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setLines((current) => [...current, { kind: 'output', value: 'Reconnected to session.' }])
          }
        >
          Reconnect
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="h-[56vh] overflow-auto rounded-sm border border-border bg-muted/20 p-3 font-mono text-sm">
            {lines.map((line, index) => (
              <pre
                key={`${line.kind}-${index}`}
                className={`whitespace-pre-wrap ${
                  line.kind === 'input' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {line.value}
              </pre>
            ))}
          </div>

          <form onSubmit={onSubmit}>
            <Input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Enter command (try: pwd, ls, git status)"
              className="font-mono"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
