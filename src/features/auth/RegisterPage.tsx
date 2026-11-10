import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Input } from "@/ui";
import { registerClinic } from "./auth.api";
import { registerErrorMessage } from "./auth-errors";
import { AuthPageShell } from "./AuthPageShell";
import { useAuth } from "./useAuth";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const empty = { clinicName: "", clinicAddress: "", doctorName: "", email: "", password: "", confirm: "" };
type Values = typeof empty;

function validate(v: Values): Partial<Record<keyof Values, string>> {
  const errors: Partial<Record<keyof Values, string>> = {};
  for (const key of Object.keys(v) as (keyof Values)[]) if (!v[key].trim()) errors[key] = "Required";
  if (v.email.trim() && !EMAIL_REGEX.test(v.email.trim())) errors.email = "Enter a valid email address";
  if (v.password && v.password.length < 6) errors.password = "Use at least 6 characters";
  if (v.confirm && v.confirm !== v.password) errors.confirm = "Passwords must match";
  return errors;
}

export function RegisterPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = submitted ? validate(values) : {};
  const field = (key: keyof Values) => ({
    value: values[key],
    error: errors[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length > 0) return;
    setBusy(true);
    setError(null);
    try {
      await registerClinic({
        email: values.email.trim(),
        password: values.password,
        clinicName: values.clinicName.trim(),
        clinicAddress: values.clinicAddress.trim(),
        doctorName: values.doctorName.trim(),
      });
      await refreshProfile();
      navigate("/patients", { replace: true });
    } catch (err) {
      setError(registerErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthPageShell
      title="Create your clinic"
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Clinic name" autoComplete="organization" {...field("clinicName")} />
        <Input label="Clinic address" autoComplete="street-address" {...field("clinicAddress")} />
        <div className="my-1 border-t border-line" />
        <Input label="Your name" placeholder="Dr. Ana Pop" autoComplete="name" {...field("doctorName")} />
        <Input label="Email" type="email" autoComplete="email" {...field("email")} />
        <Input label="Password" type="password" autoComplete="new-password" {...field("password")} />
        <Input label="Confirm password" type="password" autoComplete="new-password" {...field("confirm")} />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={busy} className="w-full">
          Create clinic
        </Button>
      </form>
    </AuthPageShell>
  );
}
