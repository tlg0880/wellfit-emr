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
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBgClass?: string;
  title: string;
}

export function PageHeader({
  title,
  description,
  backTo,
  actions,
  className,
  breadcrumbs,
  icon: Icon,
  iconBgClass = "bg-primary/10 text-primary",
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-border/60 border-b bg-card/90 px-6 py-5 shadow-md backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {backTo && (
            <Link
              className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              to={backTo}
            >
              <ChevronLeft size={18} />
            </Link>
          )}
          {Icon && (
            <div
              className={`flex size-9 items-center justify-center rounded-sm shadow-md ${iconBgClass}`}
            >
              <Icon size={18} />
            </div>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {breadcrumbs.map((crumb, crumbIndex) => (
                  <span
                    className="flex items-center gap-1.5"
                    key={`${crumb.to ?? "label"}-${crumb.label}`}
                  >
                    {crumbIndex > 0 && (
                      <span className="text-muted-foreground/40">/</span>
                    )}
                    {crumb.to ? (
                      <Link
                        className="font-medium transition-colors hover:text-primary"
                        to={crumb.to}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground/70">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="font-semibold text-foreground/90 text-xl tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-muted-foreground text-sm">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          <div className="hidden items-center gap-1.5 rounded-sm border bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground sm:flex">
            <Command size={12} />
            <span className="font-medium">K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
