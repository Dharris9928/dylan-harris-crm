import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyPolicyManager } from "./PrivacyPolicyManager";
import { DPATemplateManager } from "./DPATemplateManager";
import { FileText, FileCheck } from "lucide-react";

export function ComplianceDocumentsDashboard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>GDPR/CCPA Compliance Documents</CardTitle>
        </div>
        <CardDescription>
          Manage privacy policies, terms of service, and data processing agreements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="policies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="policies">
              <FileText className="h-4 w-4 mr-2" />
              Privacy & Terms
            </TabsTrigger>
            <TabsTrigger value="dpa">
              <FileCheck className="h-4 w-4 mr-2" />
              DPA Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <PrivacyPolicyManager />
          </TabsContent>

          <TabsContent value="dpa">
            <DPATemplateManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
