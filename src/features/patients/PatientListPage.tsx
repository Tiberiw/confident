import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { formatDate } from "@/lib/dates";
import { useLoad } from "@/lib/useLoad";
import type { Patient } from "@/types/domain";
import { Alert, buttonClass, Card, DataTable, EmptyState, PageHeader, Spinner, type Column } from "@/ui";
import { ConsentFormButton } from "./ConsentFormButton";
import { filterPatients, listPatients } from "./patients.api";

const columns: Column<Patient>[] = [
  {
    key: "name",
    header: "Name",
    render: (p) => <span className="font-medium">{[p.lastName, p.firstName].filter(Boolean).join(", ")}</span>,
  },
  { key: "dob", header: "Date of birth", render: (p) => <span className="num">{formatDate(p.dateOfBirth)}</span> },
  { key: "phone", header: "Phone", render: (p) => <span className="num">{p.phoneNumber || "—"}</span> },
  { key: "email", header: "Email", className: "hidden md:table-cell", render: (p) => <span className="text-muted">{p.email || "—"}</span> },
];

export function PatientListPage() {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const clinicId = user?.clinicId ?? "";
  const { data: patients, error, loading } = useLoad(() => listPatients(clinicId), [clinicId]);
  const rows = useMemo(() => filterPatients(patients ?? [], term), [patients, term]);

  const newPatient = !isDemo && (
    <Link to="/patients/new" className={buttonClass("primary")}>
      <Plus size={16} aria-hidden />
      New patient
    </Link>
  );

  let body;
  if (loading) {
    body = (
      <div className="flex justify-center py-12 text-brand">
        <Spinner />
      </div>
    );
  } else if (error) {
    body = (
      <div className="p-4">
        <Alert tone="error">Couldn't load patients. Check your connection and reload the page.</Alert>
      </div>
    );
  } else if (!patients?.length) {
    body = (
      <EmptyState
        title="No patients yet"
        description="Add a patient to start analysing their panoramic X-rays."
        action={
          !isDemo && (
            <Link to="/patients/new" className={buttonClass("primary")}>
              Add your first patient
            </Link>
          )
        }
      />
    );
  } else {
    body = (
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/patients/${p.id}`)}
        empty={<EmptyState title="No matching patients" description={`Nobody's first or last name contains "${term.trim()}".`} />}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={patients && patients.length > 0 ? `${patients.length} ${patients.length === 1 ? "patient" : "patients"}` : undefined}
        actions={
          <>
            <ConsentFormButton />
            {newPatient}
          </>
        }
      />
      <Card bodyClassName="">
        {patients && patients.length > 0 && (
          <div className="border-b border-line p-3">
            <label className="relative block max-w-xs">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                aria-label="Search patients"
                placeholder="Search by name"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="h-9 w-full rounded border border-line-strong bg-surface pl-8 pr-3 text-base placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
          </div>
        )}
        {body}
      </Card>
    </>
  );
}
