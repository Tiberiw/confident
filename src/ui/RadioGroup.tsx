import type { SelectOption } from "./Select";

export interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function RadioGroup({ label, name, value, options, onChange, error, required, disabled }: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col" aria-invalid={error ? true : undefined} disabled={disabled}>
      <legend className="mb-1.5 text-label font-medium text-muted">
        {label}
        {required && <span aria-hidden> *</span>}
      </legend>
      <div className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="inline-flex cursor-pointer items-center gap-2 text-base">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-label text-danger">{error}</p>}
    </fieldset>
  );
}
