import { useId, type ReactNode } from "react";

export interface FieldControlProps {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label, control and hint/error text, wired together for screen readers. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={className ?? "flex flex-col gap-1.5"}>
      <label htmlFor={id} className="text-label font-medium text-muted">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": note ? noteId : undefined })}
      {note && (
        <p id={noteId} className={error ? "text-label text-danger" : "text-label text-muted"}>
          {note}
        </p>
      )}
    </div>
  );
}

export const controlClass =
  "w-full rounded border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-muted/70 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 " +
  "disabled:cursor-not-allowed disabled:bg-page disabled:text-muted read-only:bg-page " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20";
