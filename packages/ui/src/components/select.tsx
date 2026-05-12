"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@wellfit-emr/ui/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import type * as React from "react";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  children: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "group inline-flex h-8 w-full items-center justify-between gap-2 rounded-sm border border-input bg-transparent px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <ChevronDown className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value> & {
  placeholder?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" data-slot="select-value">
      <SelectPrimitive.Value
        className={cn("text-foreground", className)}
        placeholder={
          placeholder ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : undefined
        }
        {...props}
      />
    </span>
  );
}

function SelectPortal({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Portal>) {
  return <SelectPrimitive.Portal data-slot="select-portal" {...props} />;
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Positioner> & {
  children: React.ReactNode;
}) {
  return (
    <SelectPortal>
      <SelectPrimitive.Positioner
        className="isolate z-50 outline-none"
        data-slot="select-positioner"
        {...props}
      >
        <SelectPrimitive.Popup
          className={cn(
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-60 w-[--anchor-width] min-w-[--anchor-width] overflow-y-auto overflow-x-hidden rounded-md border border-input bg-popover text-popover-foreground shadow-lg outline-none data-closed:animate-out data-open:animate-in data-closed:duration-100 data-open:duration-100",
            className
          )}
          data-slot="select-content"
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPortal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  children: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 px-2.5 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      data-slot="select-item"
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectGroup({
  className,
  children,
  label,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group> & {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <SelectPrimitive.Group
      className={cn("", className)}
      data-slot="select-group"
      {...props}
    >
      {label && (
        <SelectPrimitive.GroupLabel className="px-2.5 py-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </SelectPrimitive.GroupLabel>
      )}
      {children}
    </SelectPrimitive.Group>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      data-slot="select-separator"
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
