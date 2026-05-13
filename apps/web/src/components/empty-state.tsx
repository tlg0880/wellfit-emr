import { Button } from "@wellfit-emr/ui/components/button";
import { cn } from "@wellfit-emr/ui/lib/utils";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  actionLabel?: string;
  className?: string;
  description?: string;
  onAction?: () => void;
  title?: string;
}

export function EmptyState({
  title = "Sin registros",
  description = "No se encontraron datos para mostrar.",
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-border/80 border-dashed bg-card/70 py-16 text-center",
        className
      )}
    >
      <div className="mb-3 inline-flex size-14 items-center justify-center rounded-sm bg-primary/10 text-primary shadow-md">
        <FolderOpen size={28} />
      </div>
      <p className="font-semibold text-base text-foreground/90">{title}</p>
      <p className="mt-1.5 max-w-xs text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button className="mt-5 shadow-md" onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
