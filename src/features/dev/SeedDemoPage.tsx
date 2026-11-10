import { useState } from "react";
import { lockAsDemo } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/useAuth";
import { createCase } from "@/features/cases/cases.api";
import { getClinic, updateClinic } from "@/features/clinic/clinic.api";
import { createPatient, listPatients } from "@/features/patients/patients.api";
import { scaleBoxes } from "@/lib/geometry";
import { compressImage } from "@/lib/image-compress";
import { loadImageFile } from "@/lib/image-file";
import { useLoad } from "@/lib/useLoad";
import { analyzeXRay } from "@/ml/analyze";
import type { Detections } from "@/types/domain";
import { Alert, Button, Card, Dialog, PageHeader, Spinner } from "@/ui";
import { DEMO_PATIENTS } from "./demo-patients";

const DEMO_CLINIC_NAME = "Smile Dental Clinic (Demo)";
const REFERRING_DENTIST = "Dr. Radu Stan";

/** Development-only page that fills a fresh clinic with fictional demo data, then locks the account read-only. */
export default function SeedDemoPage() {
  const { user, isDemo, refreshProfile } = useAuth();
  const clinicId = user?.clinicId ?? "";
  const existing = useLoad(() => listPatients(clinicId), [clinicId]);
  const [files, setFiles] = useState<File[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [locking, setLocking] = useState(false);

  const note = (line: string) => setLog((l) => [...l, line]);

  if (!user) return null;
  if (isDemo) return <Alert tone="info">This account is already locked as the read-only demo.</Alert>;
  if (existing.loading) {
    return (
      <div className="flex justify-center py-16 text-brand">
        <Spinner />
      </div>
    );
  }
  const patientCount = existing.data?.length ?? 0;
  // Seed only an empty clinic; lock once it has data (seeded now or on an earlier visit).
  const canSeed = patientCount === 0 && !done;
  const canLock = done || patientCount > 0;

  const seed = async () => {
    setRunning(true);
    setError(null);
    setLog([]);
    try {
      const clinic = await getClinic(clinicId);
      await updateClinic(clinicId, { name: DEMO_CLINIC_NAME, address: clinic?.address || "Str. Exemplului 1, Cluj-Napoca" });
      note(`Clinic renamed to "${DEMO_CLINIC_NAME}"`);

      const ids: string[] = [];
      for (const p of DEMO_PATIENTS) {
        ids.push(await createPatient(clinicId, p));
        note(`Patient ${p.firstName} ${p.lastName} created`);
      }

      for (const [i, file] of files.entries()) {
        const p = DEMO_PATIENTS[i];
        note(`Analysing ${file.name} for ${p.firstName} ${p.lastName}…`);
        const { img, url } = await loadImageFile(file);
        try {
          const result = await analyzeXRay(img);
          const stored = await compressImage(img);
          const scaled = (d: Detections): Detections => ({ ...d, boxes: scaleBoxes(d.boxes, stored.scale) });
          // Spread scan dates over the last two months.
          const scanDate = new Date();
          scanDate.setHours(0, 0, 0, 0);
          scanDate.setDate(scanDate.getDate() - Math.round((60 * (i + 1)) / (files.length + 1)));
          await createCase(
            {
              clinicId,
              patientId: ids[i],
              scanDate,
              referringDentist: REFERRING_DENTIST,
              clinicalIndication: "Routine panoramic examination",
              description: "",
              radiologist: user.doctorName,
              radiologistId: user.uid,
              imageFileName: file.name,
              imageWidth: stored.width,
              imageHeight: stored.height,
              pathologies: scaled(result.pathologies),
              teeth: scaled(result.teeth),
            },
            { dataUrl: stored.dataUrl, width: stored.width, height: stored.height },
          );
          note(
            `Case saved: ${result.pathologies.boxes.length} findings, ${result.teeth.boxes.length} teeth, ${Math.round(stored.dataUrl.length / 1024)} KB image`,
          );
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      note("Done. Check the cases, then lock the account.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seeding failed");
    } finally {
      setRunning(false);
    }
  };

  const lock = async () => {
    setLocking(true);
    try {
      await lockAsDemo(user.uid);
      await refreshProfile();
    } catch {
      setError("Couldn't lock the account.");
      setLocking(false);
      setConfirmLock(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Seed demo data" subtitle="Development only. This page is not part of the production build." />
      <div className="flex flex-col gap-4">
        {patientCount > 0 && !done && (
          <Alert tone="info">
            This clinic already has {patientCount} {patientCount === 1 ? "patient" : "patients"}. Review them, then lock
            the account. To seed again, use a fresh account.
          </Alert>
        )}
        <Card title="1. Choose 2–4 anonymized panoramic X-rays">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={!canSeed || running}
            aria-label="Demo X-rays"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
          />
          <p className="mt-2 text-sm text-muted">
            {DEMO_PATIENTS.length} fictional patients are created; the first {files.length || "N"} get one case each.
          </p>
        </Card>
        <Card title="2. Seed">
          <Button onClick={() => void seed()} loading={running} disabled={!canSeed || files.length < 1}>
            Seed demo clinic
          </Button>
          {log.length > 0 && (
            <ol className="num mt-3 list-decimal pl-5 text-sm text-muted">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
          {error && (
            <div className="mt-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
        </Card>
        <Card title="3. Lock as demo">
          <p className="mb-3 text-muted">Makes this account read-only, so visitors can look around but not change anything.</p>
          <Button variant="danger" disabled={!canLock || running} onClick={() => setConfirmLock(true)}>
            Lock as demo
          </Button>
        </Card>
      </div>
      <Dialog
        open={confirmLock}
        onClose={() => !locking && setConfirmLock(false)}
        title="Lock this account?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLock(false)} disabled={locking}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void lock()} loading={locking}>
              Lock as demo
            </Button>
          </>
        }
      >
        <p>The account becomes read-only. This can't be undone from the app; only the Firebase console can change it back.</p>
      </Dialog>
    </div>
  );
}
