import { Alert, Button, ProgressBar } from "@/ui";

export function ModelLoadingCard({ progress, failed, onRetry }: { progress: number; failed: boolean; onRetry: () => void }) {
  if (failed) {
    return (
      <Alert tone="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>The AI models couldn't be loaded. Check your connection and try again.</span>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }
  return (
    <div className="rounded border border-line bg-page px-4 py-3">
      <ProgressBar value={progress} label="Loading AI models (first time only, ~22 MB)" />
    </div>
  );
}
