import type { ReactNode } from "react";
import { Wordmark } from "@/app/Wordmark";

/** Centered column used by the sign-in and registration pages. */
export function AuthPageShell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12 sm:justify-center">
      <div className="w-full max-w-sm">
        <Wordmark className="text-display" />
        <p className="mt-1 text-muted">AI-assisted analysis of panoramic dental X-rays.</p>
        <div className="mt-6 rounded border border-line bg-surface p-6">
          <h1 className="mb-5 text-title font-semibold tracking-[-0.015em]">{title}</h1>
          {children}
        </div>
        <p className="mt-5 text-center text-muted">{footer}</p>
      </div>
    </div>
  );
}
