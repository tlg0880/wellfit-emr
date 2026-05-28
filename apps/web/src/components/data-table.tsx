import { Button } from "@wellfit-emr/ui/components/button";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { cn } from "@wellfit-emr/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "./empty-state";

interface Column<T> {
  accessor: (row: T) => React.ReactNode;
  className?: string;
  header: string;
  id?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyDescription?: string;
  emptyTitle?: string;
  isLoading?: boolean;
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    onPageChange: (offset: number) => void;
  };
  rowIdExtractor?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyTitle,
  emptyDescription,
  onRowClick,
  pagination,
  rowIdExtractor,
}: DataTableProps<T>) {
  useEffect(() => {
    if (isLoading || typeof window === "undefined") {
      return;
    }

    const targetId = window.location.hash.slice(1);
    if (!targetId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  }, [isLoading]);

  if (!isLoading && data.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  const currentPage = pagination
    ? Math.floor(pagination.offset / pagination.limit) + 1
    : 1;
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 1;
  const columnKeys = columns.map((col) => col.id ?? col.header);
  const skeletonRows = [
    "skeleton-1",
    "skeleton-2",
    "skeleton-3",
    "skeleton-4",
    "skeleton-5",
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-sm border border-border bg-card shadow-md">
        <table aria-label="Tabla de datos" className="w-full text-xs">
          <thead className="bg-gradient-to-b from-primary/[0.15] to-muted/90">
            <tr className="border-border border-b">
              {columns.map((col, columnIndex) => (
                <th
                  className={cn(
                    "px-5 py-3.5 text-left font-bold text-[11px] text-muted-foreground uppercase tracking-wider",
                    col.className
                  )}
                  key={columnKeys[columnIndex]}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {isLoading
              ? skeletonRows.map((rowKey) => (
                  <tr className="bg-background" key={rowKey}>
                    {columns.map((_, columnIndex) => (
                      <td
                        className="px-4 py-4"
                        key={`${rowKey}-${columnKeys[columnIndex]}`}
                      >
                        <Skeleton className="h-3.5 w-full max-w-[8rem]" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row, rowIndex) => (
                  <tr
                    aria-rowindex={rowIndex + 1}
                    className={cn(
                      "transition-all duration-150",
                      "scroll-mt-24 target:bg-red-50 target:ring-2 target:ring-red-300 target:ring-inset",
                      rowIndex % 2 === 0 ? "bg-background" : "bg-muted/40",
                      onRowClick
                        ? "cursor-pointer hover:bg-primary/10 hover:shadow-md hover:ring-1 hover:ring-primary/20 hover:ring-inset"
                        : "hover:bg-muted/50 hover:shadow-sm hover:ring-1 hover:ring-muted-foreground/10 hover:ring-inset"
                    )}
                    id={rowIdExtractor?.(row)}
                    key={keyExtractor(row)}
                    onClick={
                      onRowClick
                        ? (e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest(
                                "button, a, input, select, textarea, [role='button']"
                              )
                            ) {
                              return;
                            }
                            onRowClick(row);
                          }
                        : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    role={onRowClick ? "link" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {columns.map((col, columnIndex) => (
                      <td
                        className={cn(
                          "px-5 py-3.5 text-foreground/90",
                          col.className
                        )}
                        key={`${keyExtractor(row)}-${columnKeys[columnIndex]}`}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 shadow-md">
          <span className="text-muted-foreground text-xs">
            Mostrando {pagination.offset + 1} -{" "}
            {Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
            de {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Primera página"
              className="hover:bg-primary/10 hover:text-primary"
              disabled={currentPage <= 1}
              onClick={() => pagination.onPageChange(0)}
              size="icon-xs"
              variant="ghost"
            >
              <ChevronsLeft size={14} />
            </Button>
            <Button
              aria-label="Página anterior"
              className="hover:bg-primary/10 hover:text-primary"
              disabled={currentPage <= 1}
              onClick={() =>
                pagination.onPageChange(pagination.offset - pagination.limit)
              }
              size="icon-xs"
              variant="ghost"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="rounded-sm bg-muted px-2 py-0.5 font-medium text-xs tabular-nums shadow-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              aria-label="Página siguiente"
              className="hover:bg-primary/10 hover:text-primary"
              disabled={currentPage >= totalPages}
              onClick={() =>
                pagination.onPageChange(pagination.offset + pagination.limit)
              }
              size="icon-xs"
              variant="ghost"
            >
              <ChevronRight size={14} />
            </Button>
            <Button
              aria-label="Última página"
              className="hover:bg-primary/10 hover:text-primary"
              disabled={currentPage >= totalPages}
              onClick={() =>
                pagination.onPageChange((totalPages - 1) * pagination.limit)
              }
              size="icon-xs"
              variant="ghost"
            >
              <ChevronsRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
