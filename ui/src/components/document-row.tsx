import Link from "next/link"
import { FileText } from "lucide-react"
import { StatusDot } from "./status-dot"

interface DocumentRowProps {
  sourceUid: string
  title: string
  status: "pending" | "processing" | "complete" | "failed"
  blockCount: number
  updatedAt: string
}

export function DocumentRow({
  sourceUid,
  title,
  status,
  blockCount,
  updatedAt
}: DocumentRowProps) {
  return (
    <Link
      href={`/documents/${sourceUid}`}
      className="group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-border hover:bg-card"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {sourceUid.slice(0, 12)}...
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
        <span className="w-20 text-right">{blockCount} blocks</span>
        <span className="w-24 text-right">{updatedAt}</span>
        <StatusDot status={status} showLabel />
      </div>

      <div className="sm:hidden">
        <StatusDot status={status} />
      </div>
    </Link>
  )
}
