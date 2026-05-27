import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  X,
} from "lucide-react";

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"] as const;
type QuoteStatus = (typeof STATUSES)[number];

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface JobQuote {
  id: string;
  quote_number: string;
  title: string;
  company_id: string | null;
  opportunity_id: string | null;
  status: string;
  total_amount: number | null;
  valid_until: string | null;
  po_filename: string | null;
  line_items: LineItem[];
  created_at: string;
}

interface CompanyOpt {
  id: string;
  name: string;
}
interface OpportunityOpt {
  id: string;
  name: string;
  company_id: string | null;
}

const emptyForm = {
  quote_number: "",
  title: "",
  company_id: "",
  opportunity_id: "",
  status: "Draft" as QuoteStatus,
  valid_until: "",
  po_filename: "",
  line_items: [] as LineItem[],
};

function statusVariant(s: string) {
  switch (s) {
    case "Accepted":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "Sent":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "Rejected":
      return "bg-red-500/15 text-red-700 border-red-500/30";
    case "Expired":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  }
}

function QuotesPage() {
  const [quotes, setQuotes] = useState<JobQuote[]>([]);
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobQuote | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [q, c, o] = await Promise.all([
      supabase.from("job_quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("opportunities").select("id, name, company_id").order("name"),
    ]);
    if (q.error) toast.error(q.error.message);
    else
      setQuotes(
        (q.data ?? []).map((r: any) => ({
          ...r,
          line_items: Array.isArray(r.line_items) ? r.line_items : [],
        })),
      );
    if (c.data) setCompanies(c.data as CompanyOpt[]);
    if (o.data) setOpportunities(o.data as OpportunityOpt[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const opportunityMap = useMemo(
    () => Object.fromEntries(opportunities.map((o) => [o.id, o.name])),
    [opportunities],
  );

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const matches =
          q.quote_number.toLowerCase().includes(s) ||
          q.title.toLowerCase().includes(s) ||
          (q.company_id && companyMap[q.company_id]?.toLowerCase().includes(s));
        if (!matches) return false;
      }
      return true;
    });
  }, [quotes, search, statusFilter, companyMap]);

  const stats = useMemo(() => {
    const total = quotes.length;
    const accepted = quotes.filter((q) => q.status === "Accepted");
    const sent = quotes.filter((q) => q.status === "Sent");
    const totalValue = quotes.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    const acceptedValue = accepted.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    return {
      total,
      sent: sent.length,
      accepted: accepted.length,
      totalValue,
      acceptedValue,
    };
  }, [quotes]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      quote_number: `Q-${Date.now().toString().slice(-6)}`,
    });
    setDialogOpen(true);
  }

  function openEdit(q: JobQuote) {
    setEditing(q);
    setForm({
      quote_number: q.quote_number,
      title: q.title,
      company_id: q.company_id ?? "",
      opportunity_id: q.opportunity_id ?? "",
      status: (q.status as QuoteStatus) ?? "Draft",
      valid_until: q.valid_until ?? "",
      po_filename: q.po_filename ?? "",
      line_items: q.line_items ?? [],
    });
    setDialogOpen(true);
  }

  const formTotal = useMemo(
    () =>
      form.line_items.reduce(
        (s, li) => s + Number(li.quantity || 0) * Number(li.unit_price || 0),
        0,
      ),
    [form.line_items],
  );

  function updateLineItem(i: number, patch: Partial<LineItem>) {
    setForm((f) => ({
      ...f,
      line_items: f.line_items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)),
    }));
  }
  function addLineItem() {
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { description: "", quantity: 1, unit_price: 0 }],
    }));
  }
  function removeLineItem(i: number) {
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit() {
    if (!form.quote_number.trim() || !form.title.trim()) {
      toast.error("Quote number and title are required");
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      toast.error("Not authenticated");
      return;
    }
    const payload = {
      quote_number: form.quote_number.trim(),
      title: form.title.trim(),
      company_id: form.company_id || null,
      opportunity_id: form.opportunity_id || null,
      status: form.status,
      valid_until: form.valid_until || null,
      po_filename: form.po_filename || null,
      line_items: form.line_items as unknown as any,
      total_amount: formTotal,
    };
    if (editing) {
      const { error } = await supabase.from("job_quotes").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Quote updated");
    } else {
      const { error } = await supabase
        .from("job_quotes")
        .insert({ ...payload, created_by: userId });
      if (error) return toast.error(error.message);
      toast.success("Quote created");
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("job_quotes").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Quote deleted");
      load();
    }
    setDeleteId(null);
  }

  async function quickStatus(q: JobQuote, status: QuoteStatus) {
    const { error } = await supabase.from("job_quotes").update({ status }).eq("id", q.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked ${status}`);
      load();
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Quotes</h1>
          <p className="text-muted-foreground">
            Create quotes, manage line items, and track quote-to-close.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Quote" : "Create Quote"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quote Number *</Label>
                  <Input
                    value={form.quote_number}
                    onChange={(e) => setForm({ ...form, quote_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as QuoteStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Smart Home Package – Phase 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                          (o) => !form.company_id || o.company_id === form.company_id,
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PO Filename</Label>
                  <Input
                    value={form.po_filename}
                    onChange={(e) => setForm({ ...form, po_filename: e.target.value })}
                    placeholder="PO-12345.pdf"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Line Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                {form.line_items.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No line items. Click Add to start.
                  </p>
                )}
                {form.line_items.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={li.description}
                        onChange={(e) => updateLineItem(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={li.quantity}
                        onChange={(e) =>
                          updateLineItem(i, { quantity: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        value={li.unit_price}
                        onChange={(e) =>
                          updateLineItem(i, { unit_price: Number(e.target.value) })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLineItem(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t mt-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">
                      ${formTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.acceptedValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by quote #, title, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
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
                  <TableHead>Quote #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No quotes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                      <TableCell className="font-medium">{q.title}</TableCell>
                      <TableCell>
                        {q.company_id ? companyMap[q.company_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {q.opportunity_id ? opportunityMap[q.opportunity_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={q.status}
                          onValueChange={(v) => quickStatus(q, v as QuoteStatus)}
                        >
                          <SelectTrigger className="h-7 w-[120px]">
                            <Badge variant="outline" className={statusVariant(q.status)}>
                              {q.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(q.total_amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {q.valid_until ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {q.valid_until}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(q.id)}
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
            <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Line items and PO reference will be removed.
            </AlertDialogDescription>
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

export const Route = createFileRoute("/_authenticated/job-quotes")({
  component: QuotesPage,
});
