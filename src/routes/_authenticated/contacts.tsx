import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Plus, Search, Pencil, Trash2, Mail, Phone, Linkedin, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

interface Contact {
  id: string;
  company_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedin_url: string | null;
  decision_authority: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

interface CompanyRef {
  id: string;
  name: string;
}

const AUTHORITY = ["Decision Maker", "Influencer", "Champion", "End User", "Gatekeeper"];

function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<CompanyRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [authorityFilter, setAuthorityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const load = async () => {
    setLoading(true);
    const [contactsRes, companiesRes] = await Promise.all([
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    if (contactsRes.error) toast.error(contactsRes.error.message);
    else setContacts((contactsRes.data as Contact[]) || []);
    if (!companiesRes.error) setCompanies(companiesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies]
  );

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (companyFilter !== "all" && c.company_id !== companyFilter) return false;
      if (authorityFilter !== "all" && c.decision_authority !== authorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !(c.email || "").toLowerCase().includes(q) &&
          !(c.title || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [contacts, search, companyFilter, authorityFilter]);

  const stats = useMemo(() => ({
    total: contacts.length,
    primary: contacts.filter((c) => c.is_primary).length,
    decisionMakers: contacts.filter((c) => c.decision_authority === "Decision Maker").length,
    withEmail: contacts.filter((c) => !!c.email).length,
  }), [contacts]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Contact deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Decision makers, champions, and key contacts.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Primary" value={stats.primary} />
        <StatCard label="Decision Makers" value={stats.decisionMakers} />
        <StatCard label="With Email" value={stats.withEmail} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={authorityFilter} onValueChange={setAuthorityFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Authority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All authority</SelectItem>
              {AUTHORITY.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium">No contacts found</p>
              <p className="text-sm text-muted-foreground">
                {contacts.length === 0 ? "Add your first contact to get started." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.is_primary && <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />}
                        <span className="font-medium">{c.name}</span>
                      </div>
                      {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.company_id ? (companyMap[c.company_id] || "—") : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {c.decision_authority ? (
                        <Badge variant="outline">{c.decision_authority}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-muted-foreground">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="hover:text-foreground" title={c.email}>
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {(c.phone || c.mobile) && (
                          <a href={`tel:${c.phone || c.mobile}`} className="hover:text-foreground" title={c.phone || c.mobile || ""}>
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-foreground">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
        companies={companies}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ContactDialog({
  open, onOpenChange, contact, companies, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: Contact | null;
  companies: CompanyRef[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", title: "", company_id: "none",
    email: "", phone: "", mobile: "", linkedin_url: "",
    decision_authority: "none", is_primary: false, notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        title: contact.title || "",
        company_id: contact.company_id || "none",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        linkedin_url: contact.linkedin_url || "",
        decision_authority: contact.decision_authority || "none",
        is_primary: contact.is_primary,
        notes: contact.notes || "",
      });
    } else {
      setForm({
        name: "", title: "", company_id: "none", email: "", phone: "",
        mobile: "", linkedin_url: "", decision_authority: "none",
        is_primary: false, notes: "",
      });
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      name: form.name.trim(),
      title: form.title || null,
      company_id: form.company_id === "none" ? null : form.company_id,
      email: form.email || null,
      phone: form.phone || null,
      mobile: form.mobile || null,
      linkedin_url: form.linkedin_url || null,
      decision_authority: form.decision_authority === "none" ? null : form.decision_authority,
      is_primary: form.is_primary,
      notes: form.notes || null,
    };
    const result = contact
      ? await supabase.from("contacts").update(payload).eq("id", contact.id)
      : await supabase.from("contacts").insert({ ...payload, created_by: auth.user?.id });
    if (result.error) toast.error(result.error.message);
    else { toast.success(contact ? "Contact updated" : "Contact created"); onSaved(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
            </div>
            <div>
              <Label>Decision Authority</Label>
              <Select value={form.decision_authority} onValueChange={(v) => setForm({ ...form, decision_authority: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {AUTHORITY.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_primary"
                  checked={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, is_primary: v })}
                />
                <Label htmlFor="is_primary">Primary contact</Label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : contact ? "Save changes" : "Create contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
