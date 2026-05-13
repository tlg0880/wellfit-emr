import { cn } from "@wellfit-emr/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-muted/70", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
