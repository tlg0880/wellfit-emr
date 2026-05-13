import { Outlet } from "@tanstack/react-router";

import { CommandPalette } from "@/components/command-palette";
import { Topbar } from "@/components/topbar";

import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-svh">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <Topbar />
        <main className="flex-1 overflow-auto">{children ?? <Outlet />}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
