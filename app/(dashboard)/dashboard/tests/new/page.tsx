import { TestBuilderWizard } from "@/components/dashboard/TestBuilderWizard";
import { requireDashboardUser } from "@/lib/auth";

export default async function NewTestPage() {
  await requireDashboardUser();
  return <TestBuilderWizard />;
}
