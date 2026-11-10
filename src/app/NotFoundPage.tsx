import { Link } from "react-router-dom";
import { buttonClass } from "@/ui";
import { Wordmark } from "./Wordmark";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Wordmark className="text-display" />
      <h1 className="mt-4 text-title font-semibold">Page not found</h1>
      <p className="text-muted">The link may be broken, or the page was removed.</p>
      <Link to="/patients" className={buttonClass("secondary", "md", "mt-3")}>
        Go to patients
      </Link>
    </div>
  );
}
