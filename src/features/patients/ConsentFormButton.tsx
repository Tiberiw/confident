import { useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { getClinic } from "@/features/clinic/clinic.api";
import type { Patient } from "@/types/domain";
import { Button } from "@/ui";

/** Downloads the GDPR consent form, blank or pre-filled for one patient. */
export function ConsentFormButton({ patient }: { patient?: Patient }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    if (!user) return;
    setBusy(true);
    setFailed(false);
    try {
      const [clinic, { downloadConsentForm }] = await Promise.all([getClinic(user.clinicId), import("@/lib/pdf/gdpr")]);
      await downloadConsentForm(clinic ?? { id: user.clinicId, name: "", address: "", ownerUid: "" }, patient);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      loading={busy}
      onClick={() => void download()}
      title={failed ? "Couldn't create the PDF. Try again." : patient ? "Consent form pre-filled for this patient" : "Blank consent form"}
      className={failed ? "border-danger/50" : undefined}
    >
      {!busy && <FileText size={16} aria-hidden />}
      {failed ? "Try again" : "Consent form"}
    </Button>
  );
}
