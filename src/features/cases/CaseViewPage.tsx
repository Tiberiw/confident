import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { getClinic } from "@/features/clinic/clinic.api";
import { getPatient } from "@/features/patients/patients.api";
import { patientName } from "@/features/patients/patient-helpers";
import { ageFromDob, formatDate } from "@/lib/dates";
import { useLoad } from "@/lib/useLoad";
import type { Box, Case, Detections, ReportDetails } from "@/types/domain";
import { Alert, Button, buttonClass, EmptyState, PageHeader, Spinner } from "@/ui";
import { addBox, availableToothClasses, relabelBox, removeBox } from "./annotations";
import { AnnotationCanvas, type BoxType, type Selection } from "./AnnotationCanvas";
import { CaseToolbar } from "./CaseToolbar";
import { getCase, updateCaseAnnotations, updateCaseReport } from "./cases.api";
import { buildFindingRows, buildToothRows } from "./findings";
import { FindingsPanel, type PanelTab } from "./FindingsPanel";
import { LabelDialog } from "./LabelDialog";
import { pickReport } from "./report-fields";
import { ReportDetailsDialog } from "./ReportDetailsDialog";
import { useAutosave } from "./useAutosave";
import { getXRay } from "./xrays.api";

type Annotations = { pathologies: Detections; teeth: Detections };
type LabelRequest = { mode: "new"; type: BoxType; box: Box } | { mode: "edit"; selection: Selection };

export function CaseViewPage() {
  const { patientId = "", caseId = "" } = useParams();
  const { isDemo } = useAuth();
  const canEdit = !isDemo;

  const data = useLoad(async () => {
    const [c, xray, patient] = await Promise.all([getCase(caseId), getXRay(caseId), getPatient(patientId)]);
    return { c, xray, patient };
  }, [caseId, patientId]);

  const [annotations, setAnnotations] = useState<Annotations | null>(null);
  const [report, setReport] = useState<ReportDetails>({});
  const [showPathologies, setShowPathologies] = useState(true);
  const [showTeeth, setShowTeeth] = useState(true);
  const [drawTool, setDrawTool] = useState<BoxType | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [tab, setTab] = useState<PanelTab>("findings");
  const [labelRequest, setLabelRequest] = useState<LabelRequest | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const c: Case | null | undefined = data.data?.c;
  useEffect(() => {
    if (c) {
      setAnnotations({ pathologies: c.pathologies, teeth: c.teeth });
      setReport(pickReport(c));
    }
  }, [c]);

  const autosave = useAutosave((a: Annotations) => updateCaseAnnotations(caseId, a));

  const findingRows = useMemo(
    () => (annotations ? buildFindingRows(annotations.pathologies, annotations.teeth) : []),
    [annotations],
  );
  const toothRows = useMemo(() => (annotations ? buildToothRows(annotations.teeth) : []), [annotations]);

  if (data.loading) {
    return (
      <div className="flex justify-center py-16 text-brand">
        <Spinner />
      </div>
    );
  }
  const { xray, patient } = data.data ?? {};
  if (data.error || !c || !patient || c.patientId !== patientId) {
    return (
      <EmptyState
        title="Case not found"
        description="This case may have been deleted."
        action={
          <Link to={`/patients/${patientId}`} className={buttonClass("secondary")}>
            Back to patient
          </Link>
        }
      />
    );
  }
  if (!annotations) return null;

  const commit = (next: Annotations) => {
    setAnnotations(next);
    autosave.queue(next);
  };

  const select = (s: Selection | null) => {
    setSelected(s);
    // A hidden layer stays hidden: the canvas still draws the selected box on its own.
    if (s) setTab(s.type === "teeth" ? "teeth" : "findings");
  };

  const key = (t: BoxType) => (t === "teeth" ? "teeth" : "pathologies");

  const deleteSelected = () => {
    if (!selected) return;
    commit({ ...annotations, [key(selected.type)]: removeBox(annotations[key(selected.type)], selected.index) });
    setSelected(null);
  };

  const confirmLabel = (cls: number) => {
    if (!labelRequest) return;
    if (labelRequest.mode === "new") {
      const k = key(labelRequest.type);
      const next = addBox(annotations[k], labelRequest.box, cls);
      commit({ ...annotations, [k]: next });
      select({ type: labelRequest.type, index: next.boxes.length - 1 });
      setDrawTool(null);
    } else {
      const { type, index } = labelRequest.selection;
      commit({ ...annotations, [key(type)]: relabelBox(annotations[key(type)], index, cls) });
    }
    setLabelRequest(null);
  };

  const labelType: BoxType = labelRequest?.mode === "new" ? labelRequest.type : (labelRequest?.selection.type ?? "pathology");
  const editingIndex = labelRequest?.mode === "edit" ? labelRequest.selection.index : undefined;
  const editingClass =
    labelRequest?.mode === "edit" ? annotations[key(labelRequest.selection.type)].classes[labelRequest.selection.index] : undefined;

  const downloadPdf = async () => {
    if (!xray) return;
    setPdfBusy(true);
    setPdfError(false);
    try {
      const [clinic, { generateCaseReport }] = await Promise.all([getClinic(c.clinicId), import("@/lib/pdf/report")]);
      await generateCaseReport(
        { ...c, ...report, ...annotations },
        patient,
        xray,
        clinic ?? { id: c.clinicId, name: "", address: "", ownerUid: "" },
      );
    } catch {
      setPdfError(true);
    } finally {
      setPdfBusy(false);
    }
  };

  const name = patientName(patient);
  const age = ageFromDob(patient.dateOfBirth);
  const date = formatDate(c.scanDate);

  return (
    <>
      <PageHeader
        title={`Panoramic X-ray · ${date}`}
        subtitle={[name, age !== null && `${age} y`, c.referringDentist && `Referred by ${c.referringDentist}`].filter(Boolean).join(" · ")}
        breadcrumbs={[
          { label: "Patients", to: "/patients" },
          { label: name, to: `/patients/${patient.id}` },
          { label: `Case ${date}` },
        ]}
        actions={
          <>
            {canEdit && (
              <Button variant="secondary" onClick={() => setReportOpen(true)}>
                Report details
              </Button>
            )}
            <Button onClick={() => void downloadPdf()} loading={pdfBusy} disabled={!xray}>
              {!pdfBusy && <Download size={16} aria-hidden />}
              Download PDF
            </Button>
          </>
        }
      />

      {pdfError && (
        <div className="mb-4">
          <Alert tone="error" onClose={() => setPdfError(false)}>
            Couldn't create the PDF report. Please try again.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 rounded border border-line bg-surface p-3">
          <CaseToolbar
            showPathologies={showPathologies}
            showTeeth={showTeeth}
            onTogglePathologies={() => setShowPathologies((v) => !v)}
            onToggleTeeth={() => setShowTeeth((v) => !v)}
            canEdit={canEdit}
            drawTool={drawTool}
            onDrawTool={(t) => {
              setDrawTool(t);
              if (t === "teeth") setShowTeeth(true);
              if (t === "pathology") setShowPathologies(true);
            }}
            saveStatus={autosave.status}
            onRetrySave={autosave.retry}
          />
          {xray ? (
            <AnnotationCanvas
              imageSrc={xray.dataUrl}
              imageWidth={c.imageWidth || xray.width}
              imageHeight={c.imageHeight || xray.height}
              pathologies={annotations.pathologies}
              teeth={annotations.teeth}
              showPathologies={showPathologies}
              showTeeth={showTeeth}
              selected={selected}
              onSelect={select}
              onEditRequest={canEdit ? (s) => setLabelRequest({ mode: "edit", selection: s }) : undefined}
              drawTool={canEdit ? drawTool : null}
              onDrawBox={(box, type) => setLabelRequest({ mode: "new", type, box })}
            />
          ) : (
            <Alert tone="error">The X-ray image for this case is missing.</Alert>
          )}
        </div>

        <FindingsPanel
          tab={tab}
          onTab={setTab}
          findings={findingRows}
          teeth={toothRows}
          selected={selected}
          onSelect={select}
          canEdit={canEdit}
          onChangeLabel={() => selected && setLabelRequest({ mode: "edit", selection: selected })}
          onDelete={deleteSelected}
        />
      </div>

      <LabelDialog
        open={labelRequest !== null}
        type={labelType}
        toothClasses={availableToothClasses(annotations.teeth, editingIndex)}
        initial={editingClass}
        title={labelRequest?.mode === "new" ? (labelType === "teeth" ? "Label the new tooth" : "Label the new finding") : "Change label"}
        confirmLabel={labelRequest?.mode === "new" ? "Add box" : "Save label"}
        onConfirm={confirmLabel}
        onClose={() => setLabelRequest(null)}
      />

      {canEdit && (
        <ReportDetailsDialog
          open={reportOpen}
          initial={report}
          onClose={() => setReportOpen(false)}
          onSave={async (r) => {
            await updateCaseReport(caseId, r);
            setReport(r);
          }}
        />
      )}
    </>
  );
}
