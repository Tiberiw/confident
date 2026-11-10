import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Input } from "@/ui";
import { demoAvailable, signIn, signInDemo } from "./auth.api";
import { signInErrorMessage } from "./auth-errors";
import { AuthPageShell } from "./AuthPageShell";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"signin" | "demo" | null>(null);

  // On success the auth listener redirects; on failure, show why.
  const run = async (kind: "signin" | "demo", action: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await action();
    } catch (e) {
      setError(signInErrorMessage(e));
      setBusy(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    void run("signin", () => signIn(email.trim(), password));
  };

  return (
    <AuthPageShell
      title="Sign in"
      footer={
        <>
          New clinic?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={busy === "signin"} disabled={busy !== null} className="w-full">
          Sign in
        </Button>
      </form>

      {demoAvailable() && (
        <div className="mt-5 border-t border-line pt-5">
          <Button
            variant="secondary"
            className="w-full"
            loading={busy === "demo"}
            disabled={busy !== null}
            onClick={() => void run("demo", signInDemo)}
          >
            Try the demo
          </Button>
          <p className="mt-2 text-center text-sm text-muted">A read-only clinic with sample X-rays.</p>
        </div>
      )}
    </AuthPageShell>
  );
}
