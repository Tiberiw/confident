import { lazy, Suspense, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { deleteCase, listPatientCases } from "@/features/cases/cases.api";
import { NewCaseForm } from "@/features/cases/NewCaseForm";
import { ageFromDob, formatAge, formatDate } from "@/lib/dates";
import { useLoad } from "@/lib/useLoad";
import { Alert, Button, buttonClass, Card, Dialog, EmptyState, PageHeader, Spinner, Tabs, type TabItem } from "@/ui";
import { CaseHistoryTable } from "./CaseHistoryTable";
import { ConsentFormButton } from "./ConsentFormButton";
import { deletePatient, getPatient } from "./patients.api";
import { patientName } from "./patient-helpers";

type TabId = "cases" | "new-case" | "3d";

// three.js is large, so the viewer is only downloaded when the 3D tab opens.
const StlViewer = lazy(() => import("@/features/stl/StlViewer"));

const GENDER_LABEL: Record<string, string> = { M: "Male", F: "Female", "-": "Not specified" };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-label font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words">{children || "—"}</dd>
    </div>
  );
}

export function PatientDetailPage() {
  const { patientId = "" } = useParams();
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const clinicId = user?.clinicId ?? "";

  const patient = useLoad(() => getPatient(patientId), [patientId]);
  const cases = useLoad(() => listPatientCases(clinicId, patientId), [clinicId, patientId]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requested = params.get("tab");
  const tab: TabId = requested === "3d" || (requested === "new-case" && !isDemo) ? requested : "cases";
  const setTab = (id: string) => setParams(id === "cases" ? {} : { tab: id }, { replace: true });

  if (patient.loading) {
    return (
      <div className="flex justify-center py-16 text-brand">
        <Spinner />
      </div>
    );
  }
  const p = patient.data;
  if (!p) {
    return (
      <EmptyState
        title="Patient not found"
        description="This patient may have been deleted."
        action={
          <Link to="/patients" className={buttonClass("secondary")}>
            Back to patients
          </Link>
        }
      />
    );
  }

  const age = ageFromDob(p.dateOfBirth);
  const caseCount = cases.data?.length;
  const tabs: TabItem[] = [
    { id: "cases", label: "Cases", count: caseCount },
    ...(isDemo ? [] : [{ id: "new-case", label: "New case" }]),
    { id: "3d", label: "3D model" },
  ];

  const removePatient = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePatient(clinicId, p.id);
      navigate("/patients", { replace: true });
    } catch {
      setDeleteError("Couldn't delete the patient. Please try again.");
      setDeleting(false);
    }
  };

  let body: ReactNode;
  if (tab === "cases") {
    body = cases.loading ? (
      <div className="flex justify-center py-12 text-brand">
        <Spinner />
      </div>
    ) : cases.error ? (
      <div className="p-4">
        <Alert tone="error">Couldn't load this patient's cases.</Alert>
      </div>
    ) : (
      <CaseHistoryTable
        cases={cases.data ?? []}
        canDelete={!isDemo}
        onOpen={(c) => navigate(`/patients/${p.id}/cases/${c.id}`)}
        onDelete={async (c) => {
          await deleteCase(c.id);
          cases.setData((list) => list?.filter((x) => x.id !== c.id));
        }}
        empty={
          <EmptyState
            title="No cases yet"
            description="Upload a panoramic X-ray to get AI findings for this patient."
            action={!isDemo && <Button onClick={() => setTab("new-case")}>New case</Button>}
          />
        }
      />
    );
  } else if (tab === "new-case") {
    body = <NewCaseForm patient={p} />;
  } else {
    body = (
      <Suspense
        fallback={
          <div className="flex justify-center py-12 text-brand">
            <Spinner />
          </div>
        }
      >
        <StlViewer />
      </Suspense>
    );
  }

  return (
    <>
      <PageHeader
        title={patientName(p)}
        subtitle={[age !== null && formatAge(age), p.dateOfBirth && `born ${formatDate(p.dateOfBirth)}`]
          .filter(Boolean)
          .join(", ")}
        breadcrumbs={[{ label: "Patients", to: "/patients" }, { label: patientName(p) }]}
        actions={
          <>
            <ConsentFormButton patient={p} />
            {!isDemo && (
              <>
                <Link to={`/patients/${p.id}/edit`} className={buttonClass("secondary")}>
                  <Pencil size={16} aria-hidden />
                  Edit
                </Link>
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="Details" className="self-start">
          <dl className="grid gap-3">
            <Detail label="Gender">{GENDER_LABEL[p.gender] ?? p.gender}</Detail>
            <Detail label="Date of birth">
              <span className="num">{p.dateOfBirth ? formatDate(p.dateOfBirth) : ""}</span>
            </Detail>
            <Detail label="Phone">
              <span className="num">{p.phoneNumber}</span>
            </Detail>
            <Detail label="Email">{p.email}</Detail>
            <Detail label="Address">{p.address}</Detail>
            <Detail label="Notes">{p.notes}</Detail>
          </dl>
        </Card>

        <section className="min-w-0 rounded border border-line bg-surface">
          <Tabs tabs={tabs} value={tab} onChange={setTab} className="px-4" />
          <div>{body}</div>
        </section>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="Delete patient"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void removePatient()} loading={deleting}>
              Delete patient
            </Button>
          </>
        }
      >
        <p>
          Delete {patientName(p)}?{" "}
          {caseCount ? `Their ${caseCount} ${caseCount === 1 ? "case" : "cases"} and X-rays are deleted too. ` : ""}
          This can't be undone.
        </p>
        {deleteError && (
          <div className="mt-3">
            <Alert tone="error">{deleteError}</Alert>
          </div>
        )}
      </Dialog>
    </>
  );
}
