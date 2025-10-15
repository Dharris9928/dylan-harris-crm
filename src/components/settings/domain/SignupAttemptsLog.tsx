import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Download, Mail, Search } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

type DateRange = '24h' | '7d' | '30d' | 'all';

interface BlockedAttempt {
  id: string;
  email: string;
  attempted_at: string;
  blocked_reason: string;
  email_domain: string;
  is_disposable: boolean;
  mx_records_checked: boolean | null;
  ip_address: string | null;
  user_agent: string | null;
  additional_details: any;
}

export function SignupAttemptsLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['blocked-signup-attempts', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('blocked_signup_attempts')
        .select('*')
        .order('attempted_at', { ascending: false });

      // Apply date filter
      if (dateRange !== 'all') {
        const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : 720;
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        query = query.gte('attempted_at', cutoffDate);
      }

      query = query.limit(500);

      const { data, error } = await query;
      if (error) throw error;
      return data as BlockedAttempt[];
    }
  });

  const filteredAttempts = attempts?.filter(attempt => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      attempt.email?.toLowerCase().includes(search) ||
      attempt.email_domain?.toLowerCase().includes(search) ||
      attempt.blocked_reason?.toLowerCase().includes(search) ||
      attempt.ip_address?.includes(search)
    );
  });

  const handleExport = () => {
    if (!filteredAttempts || filteredAttempts.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredAttempts.map(attempt => ({
      'Date/Time': new Date(attempt.attempted_at).toLocaleString(),
      'Email': attempt.email,
      'Domain': attempt.email_domain,
      'Reason': attempt.blocked_reason,
      'Disposable': attempt.is_disposable ? 'Yes' : 'No',
      'IP Address': attempt.ip_address || 'N/A',
      'User Agent': attempt.user_agent || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Blocked Signups');
    XLSX.writeFile(wb, `blocked-signups-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export completed');
  };

  const getReasonBadge = (reason: string, isDisposable: boolean) => {
    if (isDisposable) {
      return <Badge variant="destructive">Disposable Email</Badge>;
    } else if (reason?.includes('Unauthorized domain')) {
      return <Badge variant="secondary">Unauthorized Domain</Badge>;
    } else if (reason?.includes('Rate limit')) {
      return <Badge variant="outline">Rate Limited</Badge>;
    }
    return <Badge variant="outline">Other</Badge>;
  };

  // Calculate statistics
  const stats = {
    total: filteredAttempts?.length || 0,
    disposable: filteredAttempts?.filter(a => a.is_disposable).length || 0,
    unauthorized: filteredAttempts?.filter(a => !a.is_disposable && a.blocked_reason?.includes('Unauthorized')).length || 0
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Blocked Signup Attempts
            </CardTitle>
            <CardDescription>
              Monitor and track blocked registration attempts
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Blocked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.disposable}</div>
              <p className="text-xs text-muted-foreground">Disposable Emails</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{stats.unauthorized}</div>
              <p className="text-xs text-muted-foreground">Unauthorized Domains</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, domain, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading attempts...</div>
        ) : filteredAttempts && filteredAttempts.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="text-sm">
                      {new Date(attempt.attempted_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {attempt.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{attempt.email_domain}</TableCell>
                    <TableCell>
                      {getReasonBadge(attempt.blocked_reason, attempt.is_disposable)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {attempt.ip_address || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No blocked signup attempts found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
