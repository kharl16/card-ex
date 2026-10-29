import { SlideViewer } from "@/components/presentations/SlideViewer";

export default function SlideViewerDevPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <SlideViewer url="/sample-dev.pdf" title="Dev sample" />
    </div>
  );
}
