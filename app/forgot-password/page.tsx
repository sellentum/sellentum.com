import { ForgotPasswordForm } from "@/components/auth-recovery-form";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password." copy="Enter your work email and Sellentum will send a secure link to get you back into your workspace.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
