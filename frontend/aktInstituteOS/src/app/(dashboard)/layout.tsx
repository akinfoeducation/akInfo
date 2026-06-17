"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPaletteProvider } from "@/components/command/command-palette";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    // Students belong in the portal; redirect them away from the admin dashboard
    if (user && user.roles?.includes("STUDENT") && !user.roles?.includes("INSTITUTE_ADMIN") && !user.roles?.includes("SUPER_ADMIN")) {
      router.replace("/portal/dashboard");
    }
  }, [user, router]);

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-5">{children}</main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
