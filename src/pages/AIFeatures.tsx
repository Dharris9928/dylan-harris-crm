import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Target, MessageSquare, Users, Sparkles, Building2 } from "lucide-react";
import { AILeadPrioritization } from "@/components/companies/AILeadPrioritization";
import { AIOutreachStrategy } from "@/components/companies/AIOutreachStrategy";
import { AIContactScoring } from "@/components/companies/AIContactScoring";
import { ApolloContactRecommendations } from "@/components/companies/ApolloContactRecommendations";
import { ApolloCompanyProspecting } from "@/components/companies/ApolloCompanyProspecting";
import { SmartEnrichmentRecommendations } from "@/components/companies/SmartEnrichmentRecommendations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AIFeatures = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Fetch companies for selection
  const { data: companies } = useQuery({
    queryKey: ["companies-for-ai"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, website_url, linkedin_company_url, priority_tier")
        .in("priority_tier", ["P1", "P2", "P3"])
        .order("lead_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Fetch contacts for selected company
  const { data: contacts } = useQuery({
    queryKey: ["contacts-for-ai", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", selectedCompanyId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Features
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered tools to prioritize leads, generate strategies, and score contacts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Powered by Lovable AI</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="prioritization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="prioritization">
              <Target className="h-4 w-4 mr-2" />
              Lead Priority
            </TabsTrigger>
            <TabsTrigger value="outreach">
              <MessageSquare className="h-4 w-4 mr-2" />
              Outreach Strategy
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="h-4 w-4 mr-2" />
              Contact Scoring
            </TabsTrigger>
            <TabsTrigger value="discovery">
              <Users className="h-4 w-4 mr-2" />
              Contact Discovery
            </TabsTrigger>
            <TabsTrigger value="prospecting">
              <Building2 className="h-4 w-4 mr-2" />
              Company Prospecting
            </TabsTrigger>
            <TabsTrigger value="enrichment">
              <Sparkles className="h-4 w-4 mr-2" />
              Smart Enrichment
            </TabsTrigger>
          </TabsList>

          {/* Lead Prioritization */}
          <TabsContent value="prioritization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  How Lead Prioritization Works
                </CardTitle>
                <CardDescription>
                  AI analyzes your top companies and provides actionable prioritization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Data Collection</h4>
                      <p className="text-sm text-muted-foreground">
                        Gathers company data including lead score, contacts, financial indicators, enrichment history, and outreach activities
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">AI Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        Gemini 2.5 Flash analyzes patterns, identifies strengths/concerns, and calculates priority scores (1-100)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Actionable Insights</h4>
                      <p className="text-sm text-muted-foreground">
                        Provides key reasons, recommended actions, potential concerns, and conversion probability for each company
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AILeadPrioritization />
          </TabsContent>

          {/* Outreach Strategy */}
          <TabsContent value="outreach" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  How Outreach Strategy Works
                </CardTitle>
                <CardDescription>
                  Generates personalized outreach plans based on company context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Context Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        Analyzes company type, size, digital presence, smart home offerings, financial stability, and contact information
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Strategy Generation</h4>
                      <p className="text-sm text-muted-foreground">
                        AI creates a tailored approach including best channel, value propositions, talking points, and touchpoint sequence
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Objection Handling</h4>
                      <p className="text-sm text-muted-foreground">
                        Provides personalization elements and responses to likely objections based on company profile
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Company</CardTitle>
                <CardDescription>Choose a company to generate a personalized outreach strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name} ({company.priority_tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedCompany && (
              <AIOutreachStrategy
                companyId={selectedCompany.id}
                companyName={selectedCompany.company_name}
              />
            )}
          </TabsContent>

          {/* Contact Scoring */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  How Contact Scoring Works
                </CardTitle>
                <CardDescription>
                  AI evaluates and ranks contacts based on multiple factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Contact Evaluation</h4>
                      <p className="text-sm text-muted-foreground">
                        Analyzes title/role, accessibility (email/phone/LinkedIn), digital engagement, and decision-making authority
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Scoring & Ranking</h4>
                      <p className="text-sm text-muted-foreground">
                        Assigns scores (1-100) and priority levels (High/Medium/Low) based on relevance to smart home sales
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Contact Recommendations</h4>
                      <p className="text-sm text-muted-foreground">
                        Provides key strengths, recommended approach, and best time to reach out for each contact
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Company</CardTitle>
                <CardDescription>Choose a company to score its contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name} ({company.priority_tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedCompany && contacts && (
              <AIContactScoring
                companyId={selectedCompany.id}
                companyName={selectedCompany.company_name}
                contacts={contacts}
              />
            )}
          </TabsContent>

          {/* Contact Discovery */}
          <TabsContent value="discovery" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Company for Contact Discovery</CardTitle>
                <CardDescription>Find decision-makers using Apollo.io</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedCompany && (
              <ApolloContactRecommendations
                companyId={selectedCompany.id}
                companyName={selectedCompany.company_name}
                websiteUrl={selectedCompany.website_url}
              />
            )}
          </TabsContent>

          {/* Company Prospecting */}
          <TabsContent value="prospecting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  How Company Prospecting Works
                </CardTitle>
                <CardDescription>
                  Find and import new companies from Apollo's B2B database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Define Your ICP</h4>
                      <p className="text-sm text-muted-foreground">
                        Set search criteria: industry keywords, company size, revenue, location, and technology stack
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Search Apollo Database</h4>
                      <p className="text-sm text-muted-foreground">
                        Query Apollo's 275M+ company database to find prospects matching your criteria
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Review & Import</h4>
                      <p className="text-sm text-muted-foreground">
                        Review results with company details, select prospects, and import them directly into your CRM as leads
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ApolloCompanyProspecting />
          </TabsContent>

          {/* Smart Enrichment */}
          <TabsContent value="enrichment" className="space-y-6">
            <SmartEnrichmentRecommendations
              onEnrichCompany={(companyId) => console.log("Enrich:", companyId)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIFeatures;
