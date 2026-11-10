import { Spinner } from "@/ui";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-brand">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
