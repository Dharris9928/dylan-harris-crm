import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/placeholder/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: () => (
    <ModulePlaceholder
      title="Contacts"
      description="Decision makers, influencers, and primary contacts across all accounts."
    />
  ),
});
