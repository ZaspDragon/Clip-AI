"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/temptrack/use-auth";
import { ToastProvider } from "@/components/temptrack/use-toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
