import { useEffect, useState } from "react";
import type { ReportDetails } from "@/types/domain";
import { Alert, Button, Checkbox, Dialog, Input, RadioGroup, Textarea } from "@/ui";
import { REPORT_FIELDS, withReportDefaults } from "./report-fields";

export interface ReportDetailsDialogProps {
  open: boolean;
  initial: ReportDetails;
  onClose: () => void;
  onSave: (r: ReportDetails) => Promise<void>;
}

export function ReportDetailsDialog({ open, initial, onClose, onSave }: ReportDetailsDialogProps) {
  const [values, setValues] = useState<ReportDetails>(() => withReportDefaults(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(withReportDefaults(initial));
      setError(null);
    }
    // Reload the saved values each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key: keyof ReportDetails, v: string | boolean) => setValues((p) => ({ ...p, [key]: v }));
  const fields = REPORT_FIELDS.filter((f) => !f.advanced || values.showAdvancedFindings);
  const sections = [...new Set(fields.map((f) => f.section))];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch {
      setError("Couldn't save the report details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      title="Report details"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save details
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-muted">These answers are printed in the radiology report alongside the AI findings.</p>
        {sections.map((section) => (
          <section key={section} className="flex flex-col gap-4">
            <h3 className="border-b border-line pb-1.5 text-section font-semibold">{section}</h3>
            {fields
              .filter((f) => f.section === section)
              .map((f) => (
                <div key={f.key} className="flex flex-col gap-2">
                  <RadioGroup
                    label={f.label}
                    name={f.key}
                    value={String(values[f.key] ?? f.options[0])}
                    options={f.options.map((o) => ({ value: o, label: o }))}
                    onChange={(v) => set(f.key, v)}
                  />
                  {f.descriptionKey && values[f.key] === f.describeWhen && (
                    <Input
                      label={f.descriptionLabel ?? "Description"}
                      value={String(values[f.descriptionKey] ?? "")}
                      onChange={(e) => set(f.descriptionKey!, e.target.value)}
                    />
                  )}
                </div>
              ))}
            {section === "Periodontal structures" && (
              <Checkbox
                label="Show advanced anatomical findings"
                checked={values.showAdvancedFindings === true}
                onChange={(v) => set("showAdvancedFindings", v)}
              />
            )}
          </section>
        ))}
        <section className="flex flex-col gap-4">
          <h3 className="border-b border-line pb-1.5 text-section font-semibold">Recommendation</h3>
          <Textarea label="Recommendation" rows={4} value={values.recommendation ?? ""} onChange={(e) => set("recommendation", e.target.value)} />
        </section>
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Dialog>
  );
}
