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
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="mb-3 inline-flex size-12 items-center justify-center bg-primary/10 text-primary">
        <FolderOpen size={22} />
      </div>
      <p className="font-semibold text-foreground/90 text-sm">{title}</p>
      <p className="mt-1 max-w-xs text-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
