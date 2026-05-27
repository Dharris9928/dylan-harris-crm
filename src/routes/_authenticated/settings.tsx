import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Shield, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

function SettingsPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({
    full_name: "",
    title: "",
    phone: "",
    mfa_enabled: false,
    session_timeout_minutes: 30,
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      if (p.data)
        setProfile({
          full_name: p.data.full_name ?? "",
          title: p.data.title ?? "",
          phone: p.data.phone ?? "",
          mfa_enabled: p.data.mfa_enabled ?? false,
          session_timeout_minutes: p.data.session_timeout_minutes ?? 30,
        });
      if (r.data) setRoles(r.data.map((x: any) => x.role));
      setLoading(false);
    })();
  }, []);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update(profile).eq("id", u.user.id);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, security, and session.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </CardTitle>
              <CardDescription>Visible to your team across the CRM.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={email} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={save} disabled={loading}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Security
              </CardTitle>
              <CardDescription>Multi-factor auth and session policy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">Multi-factor authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Require a second factor on sign-in.
                  </p>
                </div>
                <Switch
                  checked={profile.mfa_enabled}
                  onCheckedChange={(v) => setProfile({ ...profile, mfa_enabled: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Session timeout (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={profile.session_timeout_minutes}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      session_timeout_minutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <Button onClick={save}>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assigned Roles</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles assigned</p>
                  ) : (
                    roles.map((r) => (
                      <Badge key={r} variant="secondary">
                        {r}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Button variant="destructive" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});
