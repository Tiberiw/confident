import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { countPathologies } from "@/lib/teeth-mapping";
import type { Case } from "@/types/domain";
import { Alert, Badge, Button, DataTable, Dialog, type Column } from "@/ui";

export interface CaseHistoryTableProps {
  cases: Case[];
  canDelete: boolean;
  onOpen: (c: Case) => void;
  onDelete: (c: Case) => Promise<void>;
  empty?: ReactNode;
}

/** Pathologies as a badge, with existing treatments (fillings, root canals…) counted beside it. */
export function FindingsBadge({ c }: { c: Case }) {
  const pathologies = countPathologies(c.pathologies);
  const treatments = c.pathologies.boxes.length - pathologies;
  if (pathologies + treatments === 0) return <Badge tone="brand">No findings</Badge>;
  return (
    <span className="inline-flex items-center gap-2">
      {pathologies === 0 ? (
        <Badge tone="brand">No pathologies</Badge>
      ) : (
        <Badge tone="warn">
          {pathologies} {pathologies === 1 ? "pathology" : "pathologies"}
        </Badge>
      )}
      {treatments > 0 && (
        <span className="text-sm text-muted">
          {treatments} {treatments === 1 ? "treatment" : "treatments"}
        </span>
      )}
    </span>
  );
}

export function CaseHistoryTable({ cases, canDelete, onOpen, onDelete, empty = null }: CaseHistoryTableProps) {
  const [pending, setPending] = useState<Case | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns: Column<Case>[] = [
    { key: "date", header: "Scan date", render: (c) => <span className="num">{formatDate(c.scanDate)}</span> },
    { key: "dentist", header: "Referring dentist", render: (c) => c.referringDentist || "—" },
    { key: "findings", header: "Findings", render: (c) => <FindingsBadge c={c} /> },
  ];
  if (canDelete) {
    columns.push({
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (c) => (
        <button
          type="button"
          aria-label={`Delete case from ${formatDate(c.scanDate)}`}
          onClick={(e) => {
            e.stopPropagation();
            setError(null);
            setPending(c);
          }}
          className="rounded p-1.5 text-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Trash2 size={16} />
        </button>
      ),
    });
  }

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await onDelete(pending);
      setPending(null);
    } catch {
      setError("Couldn't delete the case. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DataTable columns={columns} rows={cases} rowKey={(c) => c.id} onRowClick={onOpen} empty={empty} />
      <Dialog
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        title="Delete case"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirm()} loading={busy}>
              Delete case
            </Button>
          </>
        }
      >
        <p>
          Delete the case from <span className="num">{formatDate(pending?.scanDate ?? null)}</span>? The X-ray and its
          findings are deleted too. This can't be undone.
        </p>
        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </Dialog>
    </>
  );
}
