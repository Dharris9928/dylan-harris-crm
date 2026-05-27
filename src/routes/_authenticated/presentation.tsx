import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/presentation")({
  component: () => (
    <ModulePlaceholder
      title="Presentations"
      description="Build, preview, and share sales presentations with section-level analytics."
    />
  ),
});
