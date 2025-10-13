import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeManagementLog } from "./ChangeManagementLog";
import { SecurityIncidentsTracker } from "./SecurityIncidentsTracker";
import { Shield, FileText, AlertTriangle } from "lucide-react";

export function SOC2ComplianceDashboard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>SOC 2 Type II Compliance</CardTitle>
        </div>
        <CardDescription>
          Security controls, change management, and incident tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="changes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="changes">
              <FileText className="h-4 w-4 mr-2" />
              Change Management
            </TabsTrigger>
            <TabsTrigger value="incidents">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Security Incidents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="changes">
            <ChangeManagementLog />
          </TabsContent>

          <TabsContent value="incidents">
            <SecurityIncidentsTracker />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
