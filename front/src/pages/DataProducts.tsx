import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Rocket, Plus } from 'lucide-react'

export default function DataProductsPage() {
  const [isNew, setIsNew] = useState(false)

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Data products</h1>
      </div>

      <Button size="sm" onClick={() => setIsNew((current) => !current)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New data product
      </Button>

      {!isNew && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              There are currently no data products registered.
            </p>
          </CardContent>
        </Card>
      )}

      {isNew && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-5">
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1">
                <Label htmlFor="uuid">UUID</Label>
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this data product.
                </p>
                <Input id="uuid" placeholder="e.g. a unique identifier" />
              </div>

              <div className="space-y-1">
                <Label>Object type</Label>
                <p className="text-xs text-muted-foreground">
                  Pipeline, block, etc. Currently, only pipeline is supported.
                </p>
                <select
                  defaultValue="pipeline"
                  className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm"
                >
                  <option value="pipeline">Only pipeline is currently supported</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Object UUID</Label>
                <p className="text-xs text-muted-foreground">
                  The UUID of the object type this global data product represents.
                </p>
                <select className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm">
                  <option value="">Select object UUID</option>
                  <option value="example_pipeline">example_pipeline</option>
                  <option value="streaming_orders">streaming_orders</option>
                </select>
              </div>

              <Button className="w-full" variant="outline">
                Create data product
              </Button>
            </CardContent>
          </Card>

          <div className="col-span-7 space-y-5">
            <Card>
              <CardContent className="space-y-2 p-4">
                <h3 className="text-lg font-semibold">Triggers</h3>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Rocket className="h-4 w-4" />
                  Nothing but empty space here. If you have filters or search queries, try clearing
                  them.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4">
                <h3 className="text-lg font-semibold">Runs</h3>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Rocket className="h-4 w-4" />
                  Nothing but empty space here. If you have filters or search queries, try clearing
                  them.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
