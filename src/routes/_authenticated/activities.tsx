import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar,
  Phone,
  Mail,
  Users,
  Presentation,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

const TYPES = ["Call", "Email", "Meeting", "Demo", "Follow-up"] as const;
const OUTCOMES = ["Scheduled", "Completed", "Cancelled"] as const;
type ActivityType = (typeof TYPES)[number];
type ActivityOutcome = (typeof OUTCOMES)[number];

interface Activity {
  id: string;
  type: string;
  outcome: string;
  subject: string | null;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  created_at: string;
}
interface Opt {
  id: string;
  name: string;
  company_id?: string | null;
}

const emptyForm = {
  type: "Call" as ActivityType,
  outcome: "Scheduled" as ActivityOutcome,
  subject: "",
  description: "",
  scheduled_at: "",
  company_id: "",
  contact_id: "",
  opportunity_id: "",
};

const TypeIcon = ({ type }: { type: string }) => {
  const cls = "h-4 w-4";
  if (type === "Call") return <Phone className={cls} />;
  if (type === "Email") return <Mail className={cls} />;
  if (type === "Meeting") return <Users className={cls} />;
  if (type === "Demo") return <Presentation className={cls} />;
  return <ArrowRight className={cls} />;
};

function outcomeVariant(o: string) {
  if (o === "Completed")
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (o === "Cancelled") return "bg-red-500/15 text-red-700 border-red-500/30";
  return "bg-amber-500/15 text-amber-700 border-amber-500/30";
}

function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Opt[]>([]);
  const [contacts, setContacts] = useState<Opt[]>([]);
  const [opportunities, setOpportunities] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [a, c, ct, o] = await Promise.all([
      supabase.from("activities").select("*").order("scheduled_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("contacts").select("id, name, company_id").order("name"),
      supabase.from("opportunities").select("id, name, company_id").order("name"),
    ]);
    if (a.error) toast.error(a.error.message);
    else setActivities((a.data ?? []) as Activity[]);
    if (c.data) setCompanies(c.data as Opt[]);
    if (ct.data) setContacts(ct.data as Opt[]);
    if (o.data) setOpportunities(o.data as Opt[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const filtered = useMemo(
    () =>
      activities.filter((a) => {
        if (typeFilter !== "all" && a.type !== typeFilter) return false;
        if (outcomeFilter !== "all" && a.outcome !== outcomeFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          const matches =
            (a.subject ?? "").toLowerCase().includes(s) ||
            (a.description ?? "").toLowerCase().includes(s) ||
            (a.company_id && companyMap[a.company_id]?.toLowerCase().includes(s));
          if (!matches) return false;
        }
        return true;
      }),
    [activities, typeFilter, outcomeFilter, search, companyMap],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = activities.filter(
      (a) =>
        a.outcome === "Scheduled" &&
        a.scheduled_at &&
        new Date(a.scheduled_at) >= now,
    ).length;
    const overdue = activities.filter(
      (a) =>
        a.outcome === "Scheduled" &&
        a.scheduled_at &&
        new Date(a.scheduled_at) < now,
    ).length;
    const completed = activities.filter((a) => a.outcome === "Completed").length;
    return { total: activities.length, upcoming, overdue, completed };
  }, [activities]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }
  function openEdit(a: Activity) {
    setEditing(a);
    setForm({
      type: a.type as ActivityType,
      outcome: a.outcome as ActivityOutcome,
      subject: a.subject ?? "",
      description: a.description ?? "",
      scheduled_at: a.scheduled_at ? a.scheduled_at.slice(0, 16) : "",
      company_id: a.company_id ?? "",
      contact_id: a.contact_id ?? "",
      opportunity_id: a.opportunity_id ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return toast.error("Not authenticated");

    const payload = {
      type: form.type,
      outcome: form.outcome,
      subject: form.subject || null,
      description: form.description || null,
      scheduled_at: form.scheduled_at
        ? new Date(form.scheduled_at).toISOString()
        : null,
      completed_at:
        form.outcome === "Completed" ? new Date().toISOString() : null,
      company_id: form.company_id || null,
      contact_id: form.contact_id || null,
      opportunity_id: form.opportunity_id || null,
    };

    if (editing) {
      const { error } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Activity updated");
    } else {
      const { error } = await supabase
        .from("activities")
        .insert({ ...payload, created_by: userId });
      if (error) return toast.error(error.message);
      toast.success("Activity logged");
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("activities").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
    setDeleteId(null);
  }

  async function markOutcome(a: Activity, outcome: ActivityOutcome) {
    const patch: any = { outcome };
    if (outcome === "Completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("activities").update(patch).eq("id", a.id);
    if (error) toast.error(error.message);
    else load();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground">
            Log calls, emails, meetings and demos across your pipeline.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Activity" : "Log Activity"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as ActivityType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Outcome</Label>
                  <Select
                    value={form.outcome}
                    onValueChange={(v) =>
                      setForm({ ...form, outcome: v as ActivityOutcome })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Discovery call with builder"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Scheduled</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_at: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Select
                    value={form.company_id || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, company_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact</Label>
                  <Select
                    value={form.contact_id || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, contact_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {contacts
                        .filter(
                          (c) =>
                            !form.company_id || c.company_id === form.company_id,
                        )
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Opportunity</Label>
                  <Select
                    value={form.opportunity_id || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, opportunity_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {opportunities
                        .filter(
                          (o) =>
                            !form.company_id || o.company_id === form.company_id,
                        )
                        .map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>{editing ? "Save" : "Log"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No activities found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          <TypeIcon type={a.type} />
                          <span>{a.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{a.subject ?? "—"}</TableCell>
                      <TableCell>
                        {a.company_id ? companyMap[a.company_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.contact_id ? contactMap[a.contact_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.scheduled_at
                          ? new Date(a.scheduled_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={a.outcome}
                          onValueChange={(v) =>
                            markOutcome(a, v as ActivityOutcome)
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px]">
                            <Badge
                              variant="outline"
                              className={outcomeVariant(a.outcome)}
                            >
                              {a.outcome}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {OUTCOMES.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/activities")({
  component: ActivitiesPage,
});
