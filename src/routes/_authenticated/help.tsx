import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Users, Briefcase, FileText, Sparkles, BarChart3, BookOpen } from "lucide-react";

const GUIDES = [
  { to: "/companies", icon: Building2, title: "Companies", desc: "Manage accounts, lead scores, and priority tiers." },
  { to: "/contacts", icon: Users, title: "Contacts", desc: "Track decision makers and influencers." },
  { to: "/opportunities", icon: Briefcase, title: "Opportunities", desc: "Pipeline stages, weighted forecast, Kanban view." },
  { to: "/job-quotes", icon: FileText, title: "Job Quotes", desc: "Build quotes with line items and track acceptance." },
  { to: "/ai-features", icon: Sparkles, title: "AI Features", desc: "Generate pipeline insights and outreach drafts." },
  { to: "/pipeline-analytics", icon: BarChart3, title: "Analytics", desc: "Stage distribution and forecast charts." },
];

const FAQS = [
  {
    q: "How is the lead score calculated?",
    a: "Lead score combines firmographic data (industry, segment, revenue), engagement signals, and contact quality. Scores 80+ are P1, 60-79 P2, 40-59 P3, below 40 P4.",
  },
  {
    q: "Who can see my companies and contacts?",
    a: "By default, only you and your admins/sales managers see records you create. Assigning a sales rep grants them access.",
  },
  {
    q: "How do I move a deal through the pipeline?",
    a: "Open Opportunities, then change the stage from the table or drag cards on the Kanban view. Stage updates are saved instantly.",
  },
  {
    q: "Can I export my data?",
    a: "Yes — go to Reports → Exports to download companies, opportunities, and activities as CSV.",
  },
  {
    q: "How do notifications work?",
    a: "The Notifications page auto-generates alerts from your data: overdue activities, upcoming meetings, stale deals (>14 days), and high-value open opportunities.",
  },
  {
    q: "What AI model powers AI Features?",
    a: "Google Gemini 2.5 Flash via the Lovable AI gateway. No external API key required.",
  },
];

function HelpPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
          <p className="text-muted-foreground">
            Module guides, FAQs, and tips to get the most out of NestPro.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Module Guides</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <Link key={g.to} to={g.to}>
                <Card className="h-full transition hover:shadow-md hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{g.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-2">{g.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need more help?</CardTitle>
          <CardDescription>
            Contact your administrator or reach out to support for additional assistance.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/help")({
  component: HelpPage,
});
