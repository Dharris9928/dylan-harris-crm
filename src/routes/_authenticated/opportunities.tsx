import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/opportunities")({
  component: () => (
    <ModulePlaceholder
      title="Opportunities"
      description="Pipeline opportunities with stage, value, probability, and forecasted close."
    />
  ),
});
