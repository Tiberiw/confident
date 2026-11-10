import { forwardRef, type InputHTMLAttributes } from "react";
import { controlClass, Field } from "./Field";
import { cx } from "./cx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, required, className, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(control) => <input ref={ref} required={required} className={cx(controlClass, "h-9")} {...control} {...rest} />}
    </Field>
  );
});
