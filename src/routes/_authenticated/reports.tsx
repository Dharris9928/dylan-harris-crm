import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => (
    <ModulePlaceholder
      title="Reports"
      description="Scoring breakdowns, contact scoring, and exportable performance reports."
    />
  ),
});
