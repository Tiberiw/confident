import { useState, type FormEvent } from "react";
import type { PatientInput } from "@/types/domain";
import { Alert, Button, DateInput, Input, Select, Textarea } from "@/ui";

const GENDERS = [
  { value: "M", label: "Male (M)" },
  { value: "F", label: "Female (F)" },
  { value: "-", label: "Not specified" },
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type Errors = Partial<Record<keyof PatientInput, string>>;

function validate(v: PatientInput): Errors {
  const e: Errors = {};
  if (!v.firstName.trim()) e.firstName = "Required";
  if (!v.lastName.trim()) e.lastName = "Required";
  if (!v.gender) e.gender = "Required";
  if (!v.dateOfBirth) e.dateOfBirth = "Required";
  else if (v.dateOfBirth > new Date()) e.dateOfBirth = "Date of birth can't be in the future";
  if (v.email.trim() && !EMAIL_REGEX.test(v.email.trim())) e.email = "Enter a valid email address";
  return e;
}

export interface PatientFormProps {
  initial: PatientInput;
  submitLabel: string;
  onSubmit: (v: PatientInput) => Promise<void>;
  onCancel: () => void;
}

export function PatientForm({ initial, submitLabel, onSubmit, onCancel }: PatientFormProps) {
  const [v, setV] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = submitted ? validate(v) : {};
  const set = <K extends keyof PatientInput>(key: K, value: PatientInput[K]) => setV((p) => ({ ...p, [key]: value }));
  const text = (key: "firstName" | "lastName" | "email" | "phoneNumber" | "address") => ({
    value: v[key],
    error: errors[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(v)).length) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(v);
    } catch {
      setError("Couldn't save the patient. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input label="First name" autoComplete="off" {...text("firstName")} />
      <Input label="Last name" autoComplete="off" {...text("lastName")} />
      <DateInput label="Date of birth" value={v.dateOfBirth} onChange={(d) => set("dateOfBirth", d)} error={errors.dateOfBirth} />
      <Select
        label="Gender"
        placeholder="Choose…"
        options={GENDERS}
        value={v.gender}
        onChange={(e) => set("gender", e.target.value)}
        error={errors.gender}
      />
      <Input label="Email" type="email" autoComplete="off" {...text("email")} />
      <Input label="Phone" type="tel" autoComplete="off" {...text("phoneNumber")} />
      <Input label="Address" className="flex flex-col gap-1.5 sm:col-span-2" autoComplete="off" {...text("address")} />
      <Textarea
        label="Notes"
        className="flex flex-col gap-1.5 sm:col-span-2"
        value={v.notes}
        onChange={(e) => set("notes", e.target.value)}
      />
      {error && (
        <div className="sm:col-span-2">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
