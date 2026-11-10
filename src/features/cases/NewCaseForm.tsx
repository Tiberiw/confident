import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ImageUp } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { scaleBoxes } from "@/lib/geometry";
import { compressImage } from "@/lib/image-compress";
import { loadImageFile } from "@/lib/image-file";
import { countPathologies } from "@/lib/teeth-mapping";
import type { LoadProgress } from "@/ml/models";
import type { Detections, Patient } from "@/types/domain";
import { Alert, Button, cx, DateInput, Input, Spinner, Textarea } from "@/ui";
import { AnnotationCanvas } from "./AnnotationCanvas";
import { createCase } from "./cases.api";
import { ModelLoadingCard } from "./ModelLoadingCard";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

type Analysis = { pathologies: Detections; teeth: Detections };
type XRayFile = { name: string; img: HTMLImageElement; url: string };

// The ML code (and TensorFlow.js) is only downloaded when someone opens this form.
const ml = () => Promise.all([import("@/ml/models"), import("@/ml/analyze")]);

const overall = (p: LoadProgress | null) => (!p ? 0 : p.stage === "detect" ? p.fraction / 2 : 0.5 + p.fraction / 2);

const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function NewCaseForm({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [models, setModels] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [scanDate, setScanDate] = useState<Date | null>(today);
  const [referringDentist, setReferringDentist] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<XRayFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  const startLoading = useCallback(() => {
    setModels("loading");
    ml()
      .then(([{ loadModels }]) => loadModels(setProgress))
      .then(
        () => setModels("ready"),
        () => setModels("error"),
      );
  }, []);

  useEffect(startLoading, [startLoading]);

  // Free the preview image when it is replaced or the form closes.
  useEffect(() => () => void (file && URL.revokeObjectURL(file.url)), [file]);

  const chooseFile = async (f: File | undefined) => {
    if (!f) return;
    setFileError(null);
    setSaveError(null);
    if (!f.type.startsWith("image/")) return setFileError("Please choose an image file (JPEG or PNG)");
    if (f.size > MAX_FILE_BYTES) return setFileError("Please choose an image under 12 MB");

    const id = ++runId.current;
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const { img, url } = await loadImageFile(f);
      if (id !== runId.current) return URL.revokeObjectURL(url);
      setFile({ name: f.name, img, url });
      const [, { analyzeXRay }] = await ml();
      const result = await analyzeXRay(img);
      if (id === runId.current) setAnalysis(result);
    } catch {
      if (id === runId.current) setFileError("This image couldn't be analysed. Try another panoramic X-ray.");
    } finally {
      if (id === runId.current) setAnalyzing(false);
    }
  };

  const clearFile = () => {
    runId.current++;
    setFile(null);
    setAnalysis(null);
    setAnalyzing(false);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canSave = Boolean(scanDate && referringDentist.trim() && file && analysis && !saving);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || !file || !analysis || !user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const stored = await compressImage(file.img);
      const scaled = (d: Detections): Detections => ({ ...d, boxes: scaleBoxes(d.boxes, stored.scale) });
      const id = await createCase(
        {
          clinicId: user.clinicId,
          patientId: patient.id,
          scanDate,
          referringDentist: referringDentist.trim(),
          clinicalIndication: clinicalIndication.trim(),
          description: description.trim(),
          radiologist: user.doctorName,
          radiologistId: user.uid,
          imageFileName: file.name,
          imageWidth: stored.width,
          imageHeight: stored.height,
          pathologies: scaled(analysis.pathologies),
          teeth: scaled(analysis.teeth),
        },
        { dataUrl: stored.dataUrl, width: stored.width, height: stored.height },
      );
      navigate(`/patients/${patient.id}/cases/${id}`);
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message === "Image too large to store"
          ? "This image is too detailed to store. Export a smaller JPEG and try again."
          : "Couldn't save the case. Please try again.",
      );
      setSaving(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void chooseFile(e.dataTransfer.files[0]);
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5 p-4">
      {models !== "ready" && (
        <ModelLoadingCard progress={overall(progress)} failed={models === "error"} onRetry={startLoading} />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <DateInput label="Scan date" value={scanDate} onChange={setScanDate} />
          <Input label="Referring dentist" value={referringDentist} onChange={(e) => setReferringDentist(e.target.value)} />
          <Input label="Clinical indication" value={clinicalIndication} onChange={(e) => setClinicalIndication(e.target.value)} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {file ? (
            <>
              <AnnotationCanvas
                imageSrc={file.url}
                imageWidth={file.img.naturalWidth}
                imageHeight={file.img.naturalHeight}
                pathologies={analysis?.pathologies ?? { boxes: [], scores: [], classes: [] }}
                teeth={analysis?.teeth ?? { boxes: [], scores: [], classes: [] }}
                showPathologies
                showTeeth
                readOnly
                maxHeight={420}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                {analyzing ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-3.5 w-3.5 text-brand" />
                    {models === "ready" ? "Analysing the X-ray…" : "Waiting for the AI models…"}
                  </span>
                ) : analysis ? (
                  <span className="num">
                    {[
                      plural(countPathologies(analysis.pathologies), "pathology", "pathologies"),
                      plural(analysis.pathologies.boxes.length - countPathologies(analysis.pathologies), "treatment"),
                      plural(analysis.teeth.boxes.length, "tooth", "teeth"),
                    ].join(" · ")}
                  </span>
                ) : (
                  <span />
                )}
                <Button variant="ghost" size="sm" onClick={clearFile} disabled={saving}>
                  Choose another image
                </Button>
              </div>
            </>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cx(
                "flex min-h-60 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed px-6 py-10 text-center transition-colors",
                "focus-within:ring-2 focus-within:ring-brand/40",
                dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-page hover:border-brand/60",
              )}
            >
              <ImageUp size={20} className="text-muted" aria-hidden />
              <span className="font-medium">Drop a panoramic X-ray here</span>
              <span className="text-sm text-muted">or click to choose an X-ray · JPEG or PNG, up to 12 MB</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                aria-label="Choose an X-ray"
                className="sr-only"
                onChange={(e) => void chooseFile(e.target.files?.[0])}
              />
            </label>
          )}
          {fileError && <Alert tone="error">{fileError}</Alert>}
        </div>
      </div>

      {saveError && <Alert tone="error">{saveError}</Alert>}
      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        {!referringDentist.trim() && analysis && <span className="text-sm text-muted">Add the referring dentist to save.</span>}
        <Button type="submit" disabled={!canSave} loading={saving}>
          Save case
        </Button>
      </div>
    </form>
  );
}
