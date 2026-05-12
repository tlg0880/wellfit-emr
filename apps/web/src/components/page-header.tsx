import { Link } from "@tanstack/react-router";
import { cn } from "@wellfit-emr/ui/lib/utils";
import { ChevronLeft, Command } from "lucide-react";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  actions?: React.ReactNode;
  backTo?: string;
  breadcrumbs?: Breadcrumb[];
  className?: string;
  description?: string;
  title: string;
}

export function PageHeader({
  title,
  description,
  backTo,
  actions,
  className,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b bg-card px-6 py-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {backTo && (
            <Link
              className="inline-flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
              to={backTo}
            >
              <ChevronLeft size={16} />
            </Link>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                {breadcrumbs.map((crumb, crumbIndex) => (
                  <span
                    className="flex items-center gap-1"
                    key={`${crumb.to ?? "label"}-${crumb.label}`}
                  >
                    {crumbIndex > 0 && (
                      <span className="text-muted-foreground/50">/</span>
                    )}
                    {crumb.to ? (
                      <Link
                        className="transition-colors hover:text-foreground"
                        to={crumb.to}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="font-medium text-lg">{title}</h1>
            {description && (
              <p className="text-muted-foreground text-xs">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          <div className="hidden items-center gap-1.5 rounded-none border bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground sm:flex">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
