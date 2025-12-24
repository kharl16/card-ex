import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface PatchProgressProps {
  progress: {
    current: number;
    total: number;
    status: string;
  };
}

export function PatchProgress({ progress }: PatchProgressProps) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Applying Patch...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} className="h-3" />
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{progress.status}</span>
          <span>{progress.current} / {progress.total}</span>
        </div>
        
        <p className="text-sm text-center text-muted-foreground">
          Please wait while the patch is being applied. Do not close this page.
        </p>
      </CardContent>
    </Card>
  );
}