const codeOf = (e: unknown) => (e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "");

export function signInErrorMessage(e: unknown): string {
  switch (codeOf(e)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Wrong email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function registerErrorMessage(e: unknown): string {
  switch (codeOf(e)) {
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use at least 6 characters for the password.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    default:
      return "Registration failed. Please try again.";
  }
}
