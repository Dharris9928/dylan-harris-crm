import { createFileRoute, redirect, Outlet, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  Home,
  Building2,
  Users,
  DollarSign,
  ClipboardList,
  MessageSquare,
  Activity,
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { label: "Dashboard", to: "/", icon: Home },
  { label: "Companies", to: "/companies", icon: Building2 },
  { label: "Contacts", to: "/contacts", icon: Users },
  { label: "Opportunities", to: "/opportunities", icon: DollarSign },
  { label: "Job Quotes", to: "/job-quotes", icon: ClipboardList },
  { label: "Communications", to: "/communications", icon: MessageSquare },
  { label: "Activities", to: "/activities", icon: Activity },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Pipeline Analytics", to: "/pipeline-analytics", icon: TrendingUp },
  { label: "AI Features", to: "/ai-features", icon: Brain },
  { label: "Prospecting", to: "/prospecting", icon: Target },
  { label: "Help", to: "/help", icon: HelpCircle },
  { label: "Settings", to: "/settings", icon: Settings },
];


function AuthenticatedLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single();
        setUserName(profile?.full_name || data.user.email?.split("@")[0] || "User");

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        const rolesArr = roles?.map((r) => r.role) || [];
        setIsAdmin(rolesArr.includes("admin"));
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-emerald-950 text-emerald-50 transition-all duration-300 lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-16" : "w-64"} lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-emerald-800/50 px-4">
          <Building2 className={`h-6 w-6 shrink-0 text-gold-400 ${collapsed ? "mx-auto" : ""}`} />
          {!collapsed && (
            <span className="font-mono text-sm font-bold tracking-tight text-white">
              Dwayne Harris CRM
            </span>
          )}
          <button
            className="ml-auto text-emerald-400 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto py-3 px-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{
                className: "bg-emerald-800/60 text-white",
              }}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-emerald-800/40 hover:text-white ${
                collapsed ? "justify-center" : ""
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-emerald-800/50 p-3">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500/20 font-mono text-xs font-bold text-gold-400">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{userName}</p>
                {isAdmin && (
                  <div className="flex items-center gap-1 text-xs text-gold-400">
                    <Shield className="h-3 w-3" />
                    Admin
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`mt-2 w-full justify-start text-emerald-400 hover:bg-emerald-800/40 hover:text-white ${
              collapsed ? "justify-center px-2" : ""
            }`}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          <button
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden text-muted-foreground hover:text-foreground lg:block"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-mono text-xs font-bold text-emerald-700">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
