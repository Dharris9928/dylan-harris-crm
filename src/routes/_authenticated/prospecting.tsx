import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/prospecting")({
  component: () => (
    <ModulePlaceholder
      title="Prospecting"
      description="Segment cards, intent signals, and AI prospecting workflow (stubbed Apollo)."
    />
  ),
});
