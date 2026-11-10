import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {breadcrumbs.map((c, i) => (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <span aria-hidden>›</span>}
              {c.to ? (
                <Link to={c.to} className="hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink" aria-current="page">
                  {c.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold tracking-[-0.015em]">{title}</h1>
          {subtitle && <div className="num mt-1 text-base text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
