import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitBranch, Rocket } from "lucide-react";

export default function DeploymentStatus() {
  const previewUrl = "https://id-preview--2a58b559-54a3-426e-a0f2-d506f6b7f46b.lovable.app";
  const productionUrl = "https://tagex.app";
  
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Deployment Status</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1">
            <GitBranch className="h-3 w-3" />
            Auto-deploy
          </Badge>
        </div>
        <CardDescription>
          Monitor your preview and production environments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/50 bg-card/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              lovable.app
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          
          <div className="rounded-lg border border-border/50 bg-card/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">Production</span>
            </div>
            <a
              href={productionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              tagex.app
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
          <p className="font-medium">Setup Auto-Deploy:</p>
          <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
            <li>Connect Lovable to GitHub (top right button)</li>
            <li>Connect GitHub repo to Vercel</li>
            <li>Changes auto-deploy: Lovable → GitHub → Vercel</li>
          </ol>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://vercel.com/dashboard", "_blank")}
              className="gap-1 text-xs"
            >
              Open Vercel
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://docs.lovable.dev/features/github", "_blank")}
              className="gap-1 text-xs"
            >
              GitHub Setup
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
