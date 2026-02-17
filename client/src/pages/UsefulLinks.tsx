import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUsefulLinks } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ExternalLink, FileSpreadsheet, FolderOpen, Link2 } from "lucide-react";

export default function UsefulLinks() {
  useDocumentTitle("Useful Links");

  const { data, isLoading } = useQuery({
    queryKey: ["useful-links"],
    queryFn: fetchUsefulLinks,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const links = data?.links || [];

  return (
    <DashboardLayout
      title="Useful Links"
      subtitle="Quick access to all project Google Sheets and Drive folders"
      isLoading={isLoading}
    >
      <Card className="border-white/10 max-w-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <Link2 className="h-4 w-4 text-teal-400" />
            Google Sheets & Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {links.length > 0 ? (
            <div className="space-y-1">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200 text-muted-foreground hover:bg-white/5 hover:text-white group"
                >
                  {link.url.includes('drive.google.com') ? (
                    <FolderOpen className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-green-400 flex-shrink-0" />
                  )}
                  <span className="flex-1">{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sheet links configured. Make sure spreadsheet IDs are set in environment variables.
            </p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
