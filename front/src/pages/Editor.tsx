import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Folder, Save, History, ChevronRight, ChevronDown } from 'lucide-react'

type FileItem = {
  path: string
  name: string
  content: string
}

const files: FileItem[] = [
  {
    path: '/home/src/mage_data/default_repo/frontend_dist_base_path/apps.html',
    name: 'apps.html',
    content:
      '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Mage Apps</title>\n  </head>\n  <body>\n    <main id="root"></main>\n    <script>\n      console.log("Editor workspace loaded");\n    </script>\n  </body>\n</html>\n',
  },
  {
    path: '/home/src/mage_data/default_repo/frontend_dist_base_path/home.html',
    name: 'home.html',
    content: '<html><body><h1>Home</h1></body></html>\n',
  },
  {
    path: '/home/src/mage_data/default_repo/frontend_dist_base_path/index.html',
    name: 'index.html',
    content: '<html><body><h1>Index</h1></body></html>\n',
  },
]

export default function EditorPage() {
  const [query, setQuery] = useState('')
  const [treeOpen, setTreeOpen] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState(files[0].content)

  const visibleFiles = useMemo(
    () =>
      files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase().trim())),
    [query],
  )

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) || null,
    [selectedPath],
  )

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Editor</h1>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search files ..."
        className="h-9"
      />

      <div className="grid min-h-[72vh] grid-cols-12 gap-3">
        <Card className="col-span-4">
          <CardContent className="p-2">
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-1 rounded-sm px-2 py-1 text-left text-sm hover:bg-muted/50"
              onClick={() => setTreeOpen((current) => !current)}
            >
              {treeOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">home/src/mage_data/default_repo</span>
            </button>

            {treeOpen && (
              <div className="space-y-1 pl-7">
                {visibleFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      setSelectedPath(file.path)
                      setContent(file.content)
                    }}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-sm ${
                      selectedPath === file.path
                        ? 'bg-muted font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-8 overflow-hidden">
          {!selectedFile && <CardContent className="h-full p-0" />}

          {selectedFile && (
            <CardContent className="h-full p-0">
              <div className="flex items-center gap-2 border-b border-border/80 px-2 py-2">
                <Button size="sm" variant="outline" className="h-8">
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
                <Button size="sm" variant="outline" className="h-8">
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  Version history
                </Button>
                <span className="truncate text-xs text-muted-foreground">{selectedFile.path}</span>
              </div>
              <div className="h-[66vh]">
                <Editor
                  language="html"
                  value={content}
                  onChange={(value) => setContent(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
