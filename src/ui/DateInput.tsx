import type { InputHTMLAttributes } from "react";
import { controlClass, Field } from "./Field";
import { cx } from "./cx";
import { fromInputDate, toInputDate } from "@/lib/dates";

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  error?: string;
  hint?: string;
}

export function DateInput({ label, value, onChange, error, hint, required, className, ...rest }: DateInputProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(control) => (
        <input
          type="date"
          required={required}
          className={cx(controlClass, "num h-9")}
          value={toInputDate(value)}
          onChange={(e) => onChange(fromInputDate(e.target.value))}
          {...control}
          {...rest}
        />
      )}
    </Field>
  );
}
