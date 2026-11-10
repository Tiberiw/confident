import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOutUser } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/useAuth";
import { Button, cx } from "@/ui";
import { Wordmark } from "./Wordmark";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    "-mb-px inline-flex h-full items-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    isActive ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
  );

function DemoBar() {
  const navigate = useNavigate();
  const register = async () => {
    await signOutUser();
    navigate("/register");
  };
  return (
    <div className="border-b border-brand/15 bg-brand-soft text-brand-ink">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <span>You're viewing a read-only demo. Register a free clinic to upload your own X-rays.</span>
        <button type="button" onClick={() => void register()} className="font-medium underline underline-offset-2">
          Register
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await signOutUser();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-nav max-w-content items-center gap-6 px-4 sm:px-6">
          <Link to="/patients" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="flex h-full gap-5">
            <NavLink to="/patients" className={navClass}>
              Patients
            </NavLink>
            <NavLink to="/clinic" className={navClass}>
              Clinic
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden truncate text-muted sm:inline">{user?.doctorName}</span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      {isDemo && <DemoBar />}
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
