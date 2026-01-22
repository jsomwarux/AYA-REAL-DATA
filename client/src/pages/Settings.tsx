import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkHealth } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  CheckCircle,
  AlertTriangle,
  Link2,
  Key,
  FileSpreadsheet,
  ExternalLink
} from "lucide-react";

export default function Settings() {
  useDocumentTitle("Settings");
  const [constructionSheetId, setConstructionSheetId] = useState("");
  const [dealsSheetId, setDealsSheetId] = useState("");

  const { data: health, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
  });

  const isConnected = (health as any)?.sheetsConfigured;

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Configure your Google Sheets integration"
    >
      {/* Connection Status */}
      <div className="mb-6">
        {isConnected ? (
          <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-teal-500/20 p-2">
                <CheckCircle className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <p className="font-medium text-teal-400">Connected</p>
                <p className="text-sm text-muted-foreground">
                  Google Sheets API is configured and ready to use.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/20 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-400">Not Connected</p>
                <p className="text-sm text-muted-foreground">
                  Configure your Google Sheets credentials to enable data sync.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Google Sheets Setup Guide */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="h-5 w-5 text-purple-400" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to connect your Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-medium text-teal-400">
                  1
                </span>
                <div>
                  <p className="font-medium text-white">Create a Google Cloud Project</p>
                  <p className="text-muted-foreground">
                    Go to Google Cloud Console and create a new project
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-medium text-teal-400">
                  2
                </span>
                <div>
                  <p className="font-medium text-white">Enable Google Sheets API</p>
                  <p className="text-muted-foreground">
                    Navigate to APIs & Services and enable the Sheets API
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-medium text-teal-400">
                  3
                </span>
                <div>
                  <p className="font-medium text-white">Create Service Account</p>
                  <p className="text-muted-foreground">
                    Create a service account and download the JSON key file
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-medium text-teal-400">
                  4
                </span>
                <div>
                  <p className="font-medium text-white">Share Your Sheets</p>
                  <p className="text-muted-foreground">
                    Share your Google Sheets with the service account email
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-medium text-teal-400">
                  5
                </span>
                <div>
                  <p className="font-medium text-white">Add Environment Variables</p>
                  <p className="text-muted-foreground">
                    Set the credentials in Replit Secrets
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
              asChild
            >
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Google Cloud Console
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" />
              Environment Variables
            </CardTitle>
            <CardDescription>
              Add these to your Replit Secrets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-email" className="text-white">GOOGLE_SERVICE_ACCOUNT_EMAIL</Label>
              <Input
                id="service-email"
                placeholder="your-service@project.iam.gserviceaccount.com"
                disabled
                className="font-mono text-xs border-white/10 bg-white/5"
              />
              <p className="text-xs text-muted-foreground">
                The email from your service account JSON
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="private-key" className="text-white">GOOGLE_PRIVATE_KEY</Label>
              <Textarea
                id="private-key"
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                disabled
                className="h-20 font-mono text-xs border-white/10 bg-white/5"
              />
              <p className="text-xs text-muted-foreground">
                The private_key from your service account JSON
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="construction-sheet" className="text-white">CONSTRUCTION_SHEET_ID</Label>
              <Input
                id="construction-sheet"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                disabled
                className="font-mono text-xs border-white/10 bg-white/5"
              />
              <p className="text-xs text-muted-foreground">
                Found in your Google Sheet URL after /d/
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deals-sheet" className="text-white">DEALS_SHEET_ID</Label>
              <Input
                id="deals-sheet"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                disabled
                className="font-mono text-xs border-white/10 bg-white/5"
              />
              <p className="text-xs text-muted-foreground">
                The ID of your Deal Intelligence spreadsheet
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <Link2 className="h-4 w-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-400">How to find Spreadsheet ID</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In your Google Sheet URL:
                    <br />
                    <code className="text-xs text-white/70">
                      https://docs.google.com/spreadsheets/d/<strong className="text-teal-400">[SPREADSHEET_ID]</strong>/edit
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expected Sheet Format */}
      <Card className="mt-6 border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white">Expected Sheet Format</CardTitle>
          <CardDescription>
            Your Google Sheets should have these columns in the first row
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                Construction Oversight Sheet
              </h4>
              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <code className="text-xs text-muted-foreground">
                  ID | Contractor | Project | Amount | Date | Status | Flag
                </code>
              </div>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                Deal Intelligence Sheet
              </h4>
              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <code className="text-xs text-muted-foreground">
                  ID | Address | City | Price | ARV | Score | Priority
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
