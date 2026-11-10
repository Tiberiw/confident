import { forwardRef, type TextareaHTMLAttributes } from "react";
import { controlClass, Field } from "./Field";
import { cx } from "./cx";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, required, className, rows = 3, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(control) => (
        <textarea ref={ref} rows={rows} required={required} className={cx(controlClass, "py-2")} {...control} {...rest} />
      )}
    </Field>
  );
});
