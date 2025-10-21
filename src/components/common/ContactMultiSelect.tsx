import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title?: string | null;
}

interface ContactMultiSelectProps {
  contacts: Contact[];
  selectedContactIds: string[];
  onSelectedContactsChange: (contactIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ContactMultiSelect({
  contacts,
  selectedContactIds,
  onSelectedContactsChange,
  disabled = false,
  placeholder = "Select contacts...",
}: ContactMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedContacts = contacts.filter((c) =>
    selectedContactIds.includes(c.id)
  );

  const toggleContact = (contactId: string) => {
    const newSelected = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter((id) => id !== contactId)
      : [...selectedContactIds, contactId];
    onSelectedContactsChange(newSelected);
  };

  const removeContact = (contactId: string) => {
    onSelectedContactsChange(selectedContactIds.filter((id) => id !== contactId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !selectedContactIds.length && "text-muted-foreground"
            )}
          >
            {selectedContactIds.length > 0
              ? `${selectedContactIds.length} contact${selectedContactIds.length > 1 ? 's' : ''} selected`
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandList>
              <CommandEmpty>No contacts found.</CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  return (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.first_name} ${contact.last_name}`}
                      onSelect={() => toggleContact(contact.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>
                          {contact.first_name} {contact.last_name}
                        </span>
                        {contact.title && (
                          <span className="text-xs text-muted-foreground">
                            {contact.title}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="gap-1">
              {contact.first_name} {contact.last_name}
              <button
                type="button"
                onClick={() => removeContact(contact.id)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
