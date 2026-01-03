import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tool } from "@/hooks/useTools";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const handleOpenTool = () => {
    window.open(tool.tool_url, "_blank", "noopener,noreferrer");
  };

  // Truncate description if too long
  const maxDescLength = 100;
  const truncatedDesc =
    tool.description && tool.description.length > maxDescLength
      ? tool.description.substring(0, maxDescLength) + "..."
      : tool.description;

  const needsTooltip = tool.description && tool.description.length > maxDescLength;

  return (
    <Card className="flex flex-col transition-all hover:shadow-md hover:border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{tool.title}</CardTitle>
        {tool.description && (
          <CardDescription className="text-sm">
            {needsTooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{truncatedDesc}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>{tool.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              truncatedDesc
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <Button onClick={handleOpenTool} className="w-full gap-2" size="sm">
          <ExternalLink className="h-4 w-4" />
          Open Tool
        </Button>
      </CardContent>
    </Card>
  );
}
