import { cn } from "@/lib/utils"

type Status = "pending" | "processing" | "complete" | "failed"

const statusConfig: Record<Status, { color: string; label: string }> = {
  pending: { color: "bg-zinc-500", label: "Pending" },
  processing: { color: "bg-amber-500", label: "Processing" },
  complete: { color: "bg-emerald-500", label: "Complete" },
  failed: { color: "bg-rose-500", label: "Failed" },
}

interface StatusDotProps {
  status: Status
  showLabel?: boolean
  size?: "sm" | "md"
}

export function StatusDot({ status, showLabel = false, size = "sm" }: StatusDotProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-full",
        config.color,
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
      )} />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  )
}
