import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/companies")({
  component: () => (
    <ModulePlaceholder
      title="Companies"
      description="Manage builders, contractors, and accounts with lead scoring and priority tiers."
    />
  ),
});
