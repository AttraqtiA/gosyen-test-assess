import { TestBuilderWizard } from "@/components/dashboard/TestBuilderWizard";
import { requireDashboardUser } from "@/lib/auth";

export default async function EditTestPage() {
  await requireDashboardUser();
  return <TestBuilderWizard />;
}
