import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/permits")({
  component: () => (
    <ModulePlaceholder
      title="Building Permits"
      description="Permit feed by region with geographic search and value-based alerts."
    />
  ),
});
