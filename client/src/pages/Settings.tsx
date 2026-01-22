import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { checkHealth } from "@/lib/api";
import {
  CheckCircle,
  AlertTriangle,
  Link2,
  Key,
  FileSpreadsheet,
  ExternalLink
} from "lucide-react";

export default function Settings() {
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
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">Connected</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Google Sheets API is configured and ready to use.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">Not Connected</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              Configure your Google Sheets credentials to enable data sync.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Google Sheets Setup Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to connect your Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  1
                </span>
                <div>
                  <p className="font-medium">Create a Google Cloud Project</p>
                  <p className="text-muted-foreground">
                    Go to Google Cloud Console and create a new project
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  2
                </span>
                <div>
                  <p className="font-medium">Enable Google Sheets API</p>
                  <p className="text-muted-foreground">
                    Navigate to APIs & Services and enable the Sheets API
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  3
                </span>
                <div>
                  <p className="font-medium">Create Service Account</p>
                  <p className="text-muted-foreground">
                    Create a service account and download the JSON key file
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  4
                </span>
                <div>
                  <p className="font-medium">Share Your Sheets</p>
                  <p className="text-muted-foreground">
                    Share your Google Sheets with the service account email
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  5
                </span>
                <div>
                  <p className="font-medium">Add Environment Variables</p>
                  <p className="text-muted-foreground">
                    Set the credentials in Replit Secrets
                  </p>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Environment Variables
            </CardTitle>
            <CardDescription>
              Add these to your Replit Secrets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-email">GOOGLE_SERVICE_ACCOUNT_EMAIL</Label>
              <Input
                id="service-email"
                placeholder="your-service@project.iam.gserviceaccount.com"
                disabled
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                The email from your service account JSON
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="private-key">GOOGLE_PRIVATE_KEY</Label>
              <Textarea
                id="private-key"
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                disabled
                className="h-20 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                The private_key from your service account JSON
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="construction-sheet">CONSTRUCTION_SHEET_ID</Label>
              <Input
                id="construction-sheet"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                disabled
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Found in your Google Sheet URL after /d/
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deals-sheet">DEALS_SHEET_ID</Label>
              <Input
                id="deals-sheet"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                disabled
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                The ID of your Deal Intelligence spreadsheet
              </p>
            </div>

            <Alert>
              <Link2 className="h-4 w-4" />
              <AlertTitle>How to find Spreadsheet ID</AlertTitle>
              <AlertDescription className="text-xs">
                In your Google Sheet URL:
                <br />
                <code className="text-xs">
                  https://docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
                </code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Expected Sheet Format */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Expected Sheet Format</CardTitle>
          <CardDescription>
            Your Google Sheets should have these columns in the first row
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">Construction Oversight Sheet</h4>
              <div className="rounded-md border p-3">
                <code className="text-xs text-muted-foreground">
                  ID | Contractor | Project | Amount | Date | Status | Flag
                </code>
              </div>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Deal Intelligence Sheet</h4>
              <div className="rounded-md border p-3">
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
