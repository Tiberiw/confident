import type { ReactNode } from "react";
import { cx } from "./cx";

export interface CardProps {
  title?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function Card({ title, actions, className, bodyClassName, children }: CardProps) {
  return (
    <section className={cx("rounded border border-line bg-surface", className)}>
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          {title && <h2 className="text-section font-semibold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName ?? "p-4"}>{children}</div>
    </section>
  );
}
