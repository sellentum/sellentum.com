import { ResetPasswordForm } from "@/components/auth-recovery-form";
import { AuthShell } from "@/components/auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password." copy="Use the secure link from your email, then set a fresh password for your Sellentum workspace.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
