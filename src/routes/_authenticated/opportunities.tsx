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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Briefcase, Plus, Search, Pencil, Trash2, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/opportunities")({
  component: OpportunitiesPage,
});

type Stage = "Open" | "Proposal" | "Committed" | "Purchased" | "Declined";
const STAGES: Stage[] = ["Open", "Proposal", "Committed", "Purchased", "Declined"];

const stageColors: Record<Stage, string> = {
  Open: "bg-muted text-muted-foreground",
  Proposal: "bg-emerald-100 text-emerald-900",
  Committed: "bg-emerald-400 text-emerald-950",
  Purchased: "bg-emerald-600 text-white",
  Declined: "bg-red-100 text-red-900",
};

interface Opportunity {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  name: string;
  stage: Stage;
  estimated_value: number | null;
  expected_close_date: string | null;
  probability: number | null;
  notes: string | null;
  created_at: string;
}

interface CompanyRef { id: string; name: string }
interface ContactRef { id: string; name: string; company_id: string | null }

const fmt = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<CompanyRef[]>([]);
  const [contacts, setContacts] = useState<ContactRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);

  const load = async () => {
    setLoading(true);
    const [oppRes, compRes, contactRes] = await Promise.all([
      supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("contacts").select("id, name, company_id").order("name"),
    ]);
    if (oppRes.error) toast.error(oppRes.error.message);
    else setOpps((oppRes.data as Opportunity[]) || []);
    if (!compRes.error) setCompanies(compRes.data || []);
    if (!contactRes.error) setContacts(contactRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const companyMap = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);

  const filtered = useMemo(() => {
    return opps.filter((o) => {
      if (stageFilter !== "all" && o.stage !== stageFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cname = o.company_id ? (companyMap[o.company_id] || "").toLowerCase() : "";
        if (!o.name.toLowerCase().includes(q) && !cname.includes(q)) return false;
      }
      return true;
    });
  }, [opps, search, stageFilter, companyMap]);

  const stats = useMemo(() => {
    const open = opps.filter((o) => !["Purchased", "Declined"].includes(o.stage));
    const won = opps.filter((o) => o.stage === "Purchased");
    return {
      total: opps.length,
      openValue: open.reduce((s, o) => s + (o.estimated_value || 0), 0),
      weighted: open.reduce((s, o) => s + ((o.estimated_value || 0) * (o.probability || 0)) / 100, 0),
      wonValue: won.reduce((s, o) => s + (o.estimated_value || 0), 0),
    };
  }, [opps]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Opportunity deleted"); load(); }
  };

  const handleStageChange = async (id: string, stage: Stage) => {
    const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">Pipeline of deals from open to closed.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Opportunity
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={String(stats.total)} />
        <StatCard label="Open Pipeline" value={fmt(stats.openValue)} />
        <StatCard label="Weighted" value={fmt(stats.weighted)} />
        <StatCard label="Won" value={fmt(stats.wonValue)} />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Pipeline</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="table" className="mt-4">
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
                  <Briefcase className="mb-3 h-12 w-12 text-muted-foreground/50" />
                  <p className="font-medium">No opportunities</p>
                  <p className="text-sm text-muted-foreground">
                    {opps.length === 0 ? "Create your first deal to populate the pipeline." : "Try adjusting your filters."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Prob.</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {o.company_id ? (companyMap[o.company_id] || "—") : "—"}
                        </TableCell>
                        <TableCell>
                          <Select value={o.stage} onValueChange={(v) => handleStageChange(o.id, v as Stage)}>
                            <SelectTrigger className="h-7 w-[130px]">
                              <Badge className={stageColors[o.stage]} variant="outline">{o.stage}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(o.estimated_value)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{o.probability ?? 0}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {o.expected_close_date || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(o); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {o.name}?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(o.id)}>Delete</AlertDialogAction>
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
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STAGES.map((stage) => {
              const items = filtered.filter((o) => o.stage === stage);
              const total = items.reduce((s, o) => s + (o.estimated_value || 0), 0);
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={stageColors[stage]} variant="outline">{stage}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{fmt(total)}</p>
                  <div className="space-y-2">
                    {items.map((o) => (
                      <Card
                        key={o.id}
                        className="cursor-pointer transition-shadow hover:shadow-md"
                        onClick={() => { setEditing(o); setDialogOpen(true); }}
                      >
                        <CardContent className="space-y-1 p-3">
                          <p className="text-sm font-medium leading-tight">{o.name}</p>
                          {o.company_id && (
                            <p className="truncate text-xs text-muted-foreground">{companyMap[o.company_id]}</p>
                          )}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="font-mono">{fmt(o.estimated_value)}</span>
                            <span className="text-muted-foreground">{o.probability ?? 0}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && !loading && (
                      <p className="py-4 text-center text-xs text-muted-foreground">No deals</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <OpportunityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        opportunity={editing}
        companies={companies}
        contacts={contacts}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function OpportunityDialog({
  open, onOpenChange, opportunity, companies, contacts, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunity: Opportunity | null;
  companies: CompanyRef[];
  contacts: ContactRef[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", company_id: "none", contact_id: "none",
    stage: "Open" as Stage,
    estimated_value: "", probability: "0", expected_close_date: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opportunity) {
      setForm({
        name: opportunity.name,
        company_id: opportunity.company_id || "none",
        contact_id: opportunity.contact_id || "none",
        stage: opportunity.stage,
        estimated_value: opportunity.estimated_value?.toString() || "",
        probability: opportunity.probability?.toString() || "0",
        expected_close_date: opportunity.expected_close_date || "",
        notes: opportunity.notes || "",
      });
    } else {
      setForm({
        name: "", company_id: "none", contact_id: "none",
        stage: "Open", estimated_value: "", probability: "10",
        expected_close_date: "", notes: "",
      });
    }
  }, [opportunity, open]);

  const availableContacts = useMemo(() => {
    if (form.company_id === "none") return contacts;
    return contacts.filter((c) => c.company_id === form.company_id);
  }, [contacts, form.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      name: form.name.trim(),
      company_id: form.company_id === "none" ? null : form.company_id,
      contact_id: form.contact_id === "none" ? null : form.contact_id,
      stage: form.stage,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      probability: form.probability ? parseInt(form.probability) : 0,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
    };
    const result = opportunity
      ? await supabase.from("opportunities").update(payload).eq("id", opportunity.id)
      : await supabase.from("opportunities").insert({ ...payload, created_by: auth.user?.id });
    if (result.error) toast.error(result.error.message);
    else { toast.success(opportunity ? "Opportunity updated" : "Opportunity created"); onSaved(); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{opportunity ? "Edit Opportunity" : "Add Opportunity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v, contact_id: "none" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact</Label>
              <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {availableContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expected_close_date">Expected Close</Label>
              <Input id="expected_close_date" type="date" value={form.expected_close_date}
                onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="estimated_value">Estimated Value ($)</Label>
              <Input id="estimated_value" type="number" min="0" step="100" value={form.estimated_value}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="probability">Probability (%)</Label>
              <Input id="probability" type="number" min="0" max="100" value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : opportunity ? "Save changes" : "Create opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
