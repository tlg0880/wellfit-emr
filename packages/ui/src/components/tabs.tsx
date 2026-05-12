"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@wellfit-emr/ui/lib/utils";
import type * as React from "react";

function Tabs({ ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-9 items-center justify-start gap-1 border-b bg-transparent p-0",
        className
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTab({
  className,
  ...props
}: TabsPrimitive.Tab.Props & { children: React.ReactNode }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 border-transparent border-b-2 px-3 py-2 font-medium text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[selected=true]:border-primary data-[selected=true]:text-primary",
        className
      )}
      data-slot="tabs-tab"
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("mt-2", className)}
      data-slot="tabs-panel"
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab };
