import { useState, type FormEvent } from "react";
import { Alert, Button, Input } from "@/ui";
import { finishClinicSetup, signOutUser, type ClinicSetupInput } from "./auth.api";
import { registerErrorMessage } from "./auth-errors";
import { AuthPageShell } from "./AuthPageShell";
import { useAuth } from "./useAuth";

const empty: ClinicSetupInput = { clinicName: "", clinicAddress: "", doctorName: "" };

/** Shown to a login without a clinic, e.g. when sign-up was interrupted after the login was created. */
export function FinishSetupPage() {
  const { refreshProfile } = useAuth();
  const [values, setValues] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof ClinicSetupInput) => ({
    value: values[key],
    error: submitted && !values[key].trim() ? "Required" : undefined,
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(values).some((v) => !v.trim())) return;
    setBusy(true);
    setError(null);
    try {
      await finishClinicSetup({
        clinicName: values.clinicName.trim(),
        clinicAddress: values.clinicAddress.trim(),
        doctorName: values.doctorName.trim(),
      });
      await refreshProfile();
    } catch (err) {
      setError(registerErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthPageShell
      title="Finish creating your clinic"
      footer={
        <button type="button" className="font-medium text-brand hover:underline" onClick={() => void signOutUser()}>
          Sign out
        </button>
      }
    >
      <p className="mb-4 text-muted">Your login exists, but your clinic wasn't saved. Add its details to continue.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Clinic name" autoComplete="organization" {...field("clinicName")} />
        <Input label="Clinic address" autoComplete="street-address" {...field("clinicAddress")} />
        <Input label="Your name" placeholder="Dr. Ana Pop" autoComplete="name" {...field("doctorName")} />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={busy} className="w-full">
          Create clinic
        </Button>
      </form>
    </AuthPageShell>
  );
}
