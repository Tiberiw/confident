import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useLoad } from "@/lib/useLoad";
import type { PatientInput } from "@/types/domain";
import { Alert, Card, PageHeader, Spinner } from "@/ui";
import { PatientForm } from "./PatientForm";
import { createPatient, getPatient, updatePatient } from "./patients.api";
import { emptyPatient, patientName } from "./patient-helpers";

/** New patient (/patients/new) and edit patient (/patients/:patientId/edit). */
export function PatientFormPage() {
  const { patientId } = useParams();
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const { data: existing, loading, error } = useLoad(
    () => (patientId ? getPatient(patientId) : Promise.resolve(null)),
    [patientId],
  );

  if (isDemo) return <Navigate to={patientId ? `/patients/${patientId}` : "/patients"} replace />;

  const editing = Boolean(patientId);
  if (editing && loading) {
    return (
      <div className="flex justify-center py-16 text-brand">
        <Spinner />
      </div>
    );
  }
  if (editing && (error || !existing)) return <Alert tone="error">This patient doesn't exist or couldn't be loaded.</Alert>;

  const save = async (v: PatientInput) => {
    if (patientId) {
      await updatePatient(patientId, v);
      navigate(`/patients/${patientId}`, { replace: true });
    } else {
      const id = await createPatient(user!.clinicId, v);
      navigate(`/patients/${id}`, { replace: true });
    }
  };

  const initial: PatientInput = existing
    ? {
        firstName: existing.firstName,
        lastName: existing.lastName,
        gender: existing.gender,
        email: existing.email,
        phoneNumber: existing.phoneNumber,
        dateOfBirth: existing.dateOfBirth,
        address: existing.address,
        notes: existing.notes,
      }
    : emptyPatient();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={existing ? `Edit ${patientName(existing)}` : "New patient"}
        breadcrumbs={[
          { label: "Patients", to: "/patients" },
          ...(existing ? [{ label: patientName(existing), to: `/patients/${existing.id}` }] : []),
          { label: existing ? "Edit" : "New patient" },
        ]}
      />
      <Card>
        <PatientForm
          initial={initial}
          submitLabel={existing ? "Save changes" : "Add patient"}
          onSubmit={save}
          onCancel={() => navigate(existing ? `/patients/${existing.id}` : "/patients")}
        />
      </Card>
    </div>
  );
}
