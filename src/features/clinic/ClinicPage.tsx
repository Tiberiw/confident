import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { useLoad } from "@/lib/useLoad";
import { Alert, Button, Card, Input, PageHeader, Spinner } from "@/ui";
import { getClinic, updateClinic } from "./clinic.api";
import type { Clinic } from "@/types/domain";

function ClinicForm({ clinic, readOnly }: { clinic: Clinic; readOnly: boolean }) {
  const [name, setName] = useState(clinic.name);
  const [address, setAddress] = useState(clinic.address);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && !name.trim() ? "Required" : undefined;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim()) return;
    setStatus("saving");
    try {
      await updateClinic(clinic.id, { name: name.trim(), address: address.trim() });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <Input label="Clinic name" value={name} readOnly={readOnly} error={nameError} onChange={(e) => (setName(e.target.value), setStatus("idle"))} />
      <Input label="Address" value={address} readOnly={readOnly} onChange={(e) => (setAddress(e.target.value), setStatus("idle"))} />
      <p className="text-sm text-muted">The clinic name and address are printed on reports and consent forms.</p>
      {status === "saved" && <Alert tone="success">Clinic details saved.</Alert>}
      {status === "error" && <Alert tone="error">Couldn't save. Please try again.</Alert>}
      {!readOnly && (
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={status === "saving"}>
            Save changes
          </Button>
        </div>
      )}
    </form>
  );
}

export function ClinicPage() {
  const { user, isDemo } = useAuth();
  const clinicId = user?.clinicId ?? "";
  const { data: clinic, loading, error } = useLoad(() => getClinic(clinicId), [clinicId]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Clinic" />
      <div className="flex flex-col gap-4">
        <Card title="Clinic details">
          {loading ? (
            <div className="flex justify-center py-8 text-brand">
              <Spinner />
            </div>
          ) : error || !clinic ? (
            <Alert tone="error">Couldn't load the clinic details.</Alert>
          ) : (
            <ClinicForm clinic={clinic} readOnly={isDemo} />
          )}
        </Card>
        <Card title="Your account">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-label font-medium text-muted">Name</dt>
              <dd className="mt-0.5">{user?.doctorName}</dd>
            </div>
            <div>
              <dt className="text-label font-medium text-muted">Email</dt>
              <dd className="mt-0.5 break-words">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-label font-medium text-muted">Access</dt>
              <dd className="mt-0.5">{isDemo ? "Read-only demo" : "Administrator"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
