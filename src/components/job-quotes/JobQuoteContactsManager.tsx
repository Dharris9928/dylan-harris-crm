import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, User, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JobQuoteContact {
  contact_id: string;
  contact_type: "wholesale_personnel" | "nest_field_team" | "distributor_personnel" | "customer";
}

interface JobQuoteContactsManagerProps {
  contacts: JobQuoteContact[];
  onChange: (contacts: JobQuoteContact[]) => void;
  distributorId?: string;
  wholesalerId?: string;
}

const CONTACT_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "wholesale_personnel", label: "Wholesale Personnel" },
  { value: "nest_field_team", label: "Nest Field Team" },
  { value: "distributor_personnel", label: "Distributor Personnel" },
] as const;

type CompanyAssignment = "unassigned" | "wholesaler" | "distributor" | "contractor";

const CONTRACTOR_INDUSTRY_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'General Contractor', 'Home Builder'];

export function JobQuoteContactsManager({
  contacts,
  onChange,
  distributorId,
  wholesalerId,
}: JobQuoteContactsManagerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<JobQuoteContact["contact_type"]>("customer");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContact, setNewContact] = useState({ first_name: "", last_name: "", email: "" });
  const [companyAssignment, setCompanyAssignment] = useState<CompanyAssignment>("unassigned");
  const [contractorSearch, setContractorSearch] = useState("");
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [contractorPopoverOpen, setContractorPopoverOpen] = useState(false);
  const [contactNamesMap, setContactNamesMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch company names for distributor/wholesaler
  const companyIds = [distributorId, wholesalerId].filter(Boolean) as string[];
  const { data: quoteCompanies = [] } = useQuery({
    queryKey: ["quote-companies", ...companyIds],
    queryFn: async () => {
      if (companyIds.length === 0) return [];
      const { data } = await supabase
        .from("companies")
        .select("id, company_name")
        .in("id", companyIds);
      return data || [];
    },
    enabled: companyIds.length > 0,
  });

  const distributorName = quoteCompanies.find(c => c.id === distributorId)?.company_name;
  const wholesalerName = quoteCompanies.find(c => c.id === wholesalerId)?.company_name;

  // Fetch names for contacts that aren't in the cache (e.g. loaded from existing quote)
  const uncachedContactIds = contacts
    .map(c => c.contact_id)
    .filter(id => !contactNamesMap[id]);
  
  useQuery({
    queryKey: ["contact-names", ...uncachedContactIds],
    queryFn: async () => {
      if (uncachedContactIds.length === 0) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .in("id", uncachedContactIds);
      if (data) {
        const newMap: Record<string, string> = {};
        data.forEach(c => { newMap[c.id] = `${c.first_name} ${c.last_name}`; });
        setContactNamesMap(prev => ({ ...prev, ...newMap }));
      }
      return data || [];
    },
    enabled: uncachedContactIds.length > 0,
  });

  const { data: availableContacts = [], isLoading } = useQuery({
    queryKey: ["contacts-search", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("id, first_name, last_name, email, title")
        .order("first_name");

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Search contractors for the company assignment option
  const { data: contractors = [] } = useQuery({
    queryKey: ["contractor-search", contractorSearch],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, company_name")
        .in("industry_type", CONTRACTOR_INDUSTRY_TYPES)
        .order("company_name")
        .limit(15);

      if (contractorSearch) {
        query = query.ilike("company_name", `%${contractorSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: companyAssignment === "contractor",
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");

      let companyId: string | null = null;
      if (companyAssignment === "wholesaler") {
        companyId = wholesalerId || null;
      } else if (companyAssignment === "distributor") {
        companyId = distributorId || null;
      } else if (companyAssignment === "contractor") {
        companyId = selectedContractorId;
      }
      // "unassigned" leaves companyId as null

      const { data, error } = await supabase
        .from("contacts")
        .insert({
          first_name: newContact.first_name,
          last_name: newContact.last_name,
          email: newContact.email || null,
          ...(companyId ? { company_id: companyId } : {}),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["contacts-search"] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      // Add the newly created contact
      onChange([...contacts, { contact_id: data.id, contact_type: selectedType }]);
      setContactNamesMap(prev => ({ ...prev, [data.id]: `${data.first_name} ${data.last_name}` }));
      
      // Reset form
      setNewContact({ first_name: "", last_name: "", email: "" });
      setCompanyAssignment("unassigned");
      setSelectedContractorId(null);
      setContractorSearch("");
      setShowCreateForm(false);
      setOpen(false);
      
      toast({
        title: "Contact created",
        description: `${data.first_name} ${data.last_name} has been added.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addContact = (contactId: string) => {
    if (contacts.some((c) => c.contact_id === contactId)) {
      toast({
        title: "Contact already added",
        variant: "destructive",
      });
      return;
    }
    // Cache the name from available contacts
    const found = availableContacts.find(c => c.id === contactId);
    if (found) {
      setContactNamesMap(prev => ({ ...prev, [contactId]: `${found.first_name} ${found.last_name}` }));
    }
    onChange([...contacts, { contact_id: contactId, contact_type: selectedType }]);
    setOpen(false);
  };

  const removeContact = (contactId: string) => {
    onChange(contacts.filter((c) => c.contact_id !== contactId));
  };

  const updateContactType = (contactId: string, type: JobQuoteContact["contact_type"]) => {
    onChange(
      contacts.map((c) =>
        c.contact_id === contactId ? { ...c, contact_type: type } : c
      )
    );
  };

  const getContactName = (contactId: string) => {
    // Check cached names first, then search results
    if (contactNamesMap[contactId]) return contactNamesMap[contactId];
    const contact = availableContacts.find((c) => c.id === contactId);
    return contact
      ? `${contact.first_name} ${contact.last_name}`
      : "Loading...";
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "wholesale_personnel":
        return "secondary";
      case "nest_field_team":
        return "default";
      case "distributor_personnel":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected contacts */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.contact_id}
              className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{getContactName(contact.contact_id)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={contact.contact_type}
                  onValueChange={(value) =>
                    updateContactType(contact.contact_id, value as JobQuoteContact["contact_type"])
                  }
                >
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeContact(contact.contact_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add contact button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          {!showCreateForm ? (
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search contacts..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <div className="p-2 border-b">
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as JobQuoteContact["contact_type"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CommandList>
                {isLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No contacts found</CommandEmpty>
                    <CommandGroup heading="Contacts">
                      {availableContacts
                        .filter((c) => !contacts.some((sc) => sc.contact_id === c.id))
                        .map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.id}
                            onSelect={() => addContact(contact.id)}
                          >
                            <User className="mr-2 h-4 w-4" />
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
                        ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem onSelect={() => setShowCreateForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create new contact
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          ) : (
            <div className="p-4 space-y-4">
              <h4 className="font-medium">Create New Contact</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newContact.first_name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, first_name: e.target.value })
                    }
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={newContact.last_name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, last_name: e.target.value })
                    }
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>Contact Type</Label>
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as JobQuoteContact["contact_type"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Assignment */}
              <div>
                <Label>Assign to Company</Label>
                <Select
                  value={companyAssignment}
                  onValueChange={(value) => {
                    setCompanyAssignment(value as CompanyAssignment);
                    if (value !== "contractor") {
                      setSelectedContractorId(null);
                      setContractorSearch("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {wholesalerId && (
                      <SelectItem value="wholesaler">
                        Wholesaler{wholesalerName ? ` — ${wholesalerName}` : ""}
                      </SelectItem>
                    )}
                    {distributorId && (
                      <SelectItem value="distributor">
                        Distributor{distributorName ? ` — ${distributorName}` : ""}
                      </SelectItem>
                    )}
                    <SelectItem value="contractor">Contractor...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contractor search */}
              {companyAssignment === "contractor" && (
                <div>
                  <Label>Select Contractor</Label>
                  <Popover open={contractorPopoverOpen} onOpenChange={setContractorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                      >
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        {selectedContractorId
                          ? contractors.find(c => c.id === selectedContractorId)?.company_name || "Selected"
                          : "Search contractors..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search contractors..."
                          value={contractorSearch}
                          onValueChange={setContractorSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No contractors found</CommandEmpty>
                          <CommandGroup>
                            {contractors.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={() => {
                                  setSelectedContractorId(c.id);
                                  setContractorPopoverOpen(false);
                                }}
                              >
                                <Building2 className="mr-2 h-4 w-4" />
                                {c.company_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCompanyAssignment("unassigned");
                    setSelectedContractorId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => createContactMutation.mutate()}
                  disabled={
                    !newContact.first_name ||
                    !newContact.last_name ||
                    (companyAssignment === "contractor" && !selectedContractorId) ||
                    createContactMutation.isPending
                  }
                >
                  {createContactMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create & Add
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
