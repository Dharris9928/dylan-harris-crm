import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/companies")({
  component: CompaniesPage,
});

type CompanyStatus = "Lead" | "Active" | "Inactive";
type Industry = "Builder" | "Contractor" | "Energy Implementer" | "Engineer/Architect" | "Partner/Other";
type Region = "East" | "West";

interface Company {
  id: string;
  name: string;
  website: string | null;
  city: string | null;
  state: string | null;
  region: Region | null;
  industry: Industry | null;
  segment: string | null;
  status: CompanyStatus;
  priority_tier: string | null;
  lead_score: number | null;
  annual_volume: number | null;
  created_at: string;
}

const STATUSES: CompanyStatus[] = ["Lead", "Active", "Inactive"];
const INDUSTRIES: Industry[] = ["Builder", "Contractor", "Energy Implementer", "Engineer/Architect", "Partner/Other"];
const REGIONS: Region[] = ["East", "West"];
const PRIORITIES = ["P1", "P2", "P3", "P4"];

const statusColors: Record<CompanyStatus, string> = {
  Lead: "bg-muted text-muted-foreground",
  Active: "bg-emerald-600 text-white",
  Inactive: "bg-red-100 text-red-900",
};

const priorityColors: Record<string, string> = {
  P1: "bg-emerald-600 text-white",
  P2: "bg-emerald-400 text-emerald-950",
  P3: "bg-emerald-200 text-emerald-900",
  P4: "bg-muted text-muted-foreground",
};

function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setCompanies((data as Company[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (priorityFilter !== "all" && c.priority_tier !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !(c.city || "").toLowerCase().includes(q) &&
          !(c.state || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [companies, search, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    return {
      total: companies.length,
      active: companies.filter((c) => c.status === "Active").length,
      pipeline: companies.filter((c) => ["Contacted", "Engaged", "Pilot"].includes(c.status)).length,
      p1: companies.filter((c) => c.priority_tier === "P1").length,
    };
  }, [companies]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Company deleted");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Builders, contractors, and accounts in your pipeline.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="In Pipeline" value={stats.pipeline} />
        <StatCard label="P1 Priority" value={stats.p1} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
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
              <Building2 className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium">No companies found</p>
              <p className="text-sm text-muted-foreground">
                {companies.length === 0 ? "Add your first company to get started." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.website && (
                        <a
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {c.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{c.industry || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status]} variant="outline">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.priority_tier ? (
                        <Badge className={priorityColors[c.priority_tier] || ""} variant="outline">
                          {c.priority_tier}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {c.lead_score ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditing(c); setDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)}>
                              Delete
                            </AlertDialogAction>
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

      <CompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={editing}
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

function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company: Company | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    website: "",
    city: "",
    state: "",
    region: "" as Region | "",
    industry: "" as Industry | "",
    segment: "",
    status: "Lead" as CompanyStatus,
    annual_volume: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        website: company.website || "",
        city: company.city || "",
        state: company.state || "",
        region: (company.region || "") as Region | "",
        industry: (company.industry || "") as Industry | "",
        segment: company.segment || "",
        status: company.status,
        annual_volume: company.annual_volume?.toString() || "",
        notes: "",
      });
    } else {
      setForm({
        name: "", website: "", city: "", state: "",
        region: "", industry: "", segment: "",
        status: "Lead", annual_volume: "", notes: "",
      });
    }
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      name: form.name.trim(),
      website: form.website || null,
      city: form.city || null,
      state: form.state || null,
      region: (form.region || null) as Region | null,
      industry: (form.industry || null) as Industry | null,
      segment: form.segment || null,
      status: form.status,
      annual_volume: form.annual_volume ? parseInt(form.annual_volume) : null,
      notes: form.notes || null,
    };

    const result = company
      ? await supabase.from("companies").update(payload).eq("id", company.id)
      : await supabase.from("companies").insert({ ...payload, created_by: auth.user?.id });

    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success(company ? "Company updated" : "Company created");
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{company ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="example.com"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v as Region })}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v as Industry })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="segment">Segment</Label>
              <Input
                id="segment"
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value })}
                placeholder="e.g. Luxury Custom"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CompanyStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="annual_volume">Annual Volume (units)</Label>
              <Input
                id="annual_volume"
                type="number"
                value={form.annual_volume}
                onChange={(e) => setForm({ ...form, annual_volume: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : company ? "Save changes" : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
