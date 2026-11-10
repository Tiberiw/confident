import { useId, type ReactNode } from "react";

export interface CheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 text-base text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
