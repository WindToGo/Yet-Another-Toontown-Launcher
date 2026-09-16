import { AttemptLogin, SaveAccount, SubmitToonguard } from "../../../../bindings/YATL/services/loginservice";

export type LoginStepResult =
  | { status: "success" }
  | { status: "toonguard"; responseToken: string; message?: string }
  | { status: "error"; message: string };

const genericError = "Failed to reach Toontown Rewritten.";

// Checks a username/password against TTR and reports whether a Toonguard
// code is required before the account can be saved.
export async function verifyCredentials(username: string, password: string): Promise<LoginStepResult> {
  const attempt = await AttemptLogin(username, password);
  if (!attempt) return { status: "error", message: genericError };

  if (attempt.requiresToonguard) {
    return { status: "toonguard", responseToken: attempt.responseToken ?? "", message: attempt.message };
  }
  if (attempt.success) return { status: "success" };

  return { status: "error", message: attempt.message || "Invalid username or password." };
}

// Completes a login started by verifyCredentials using the Toonguard code
// emailed to the player.
export async function verifyToonguard(
  username: string,
  responseToken: string,
  code: string,
): Promise<LoginStepResult> {
  const attempt = await SubmitToonguard(username, responseToken, code);
  if (!attempt) return { status: "error", message: genericError };
  if (attempt.success) return { status: "success" };

  return { status: "error", message: attempt.message || "Invalid Toonguard code." };
}

// Stores a verified username/password in the user's keychain and config.json.
export async function addAccount(username: string, password: string): Promise<boolean> {
  const result = await SaveAccount(username, password);
  return result === 0;
}
