import { createRoot } from "react-dom/client";
import { useState } from "react";
import "./index.css";
import { SlideViewer } from "@/components/presentations/SlideViewer";
import PresentationViewerDialog from "@/components/tools/sections/PresentationViewerDialog";

function Harness() {
  const mode = new URLSearchParams(location.search).get("m");
  const [open, setOpen] = useState(true);
  if (mode === "dialog") return <PresentationViewerDialog open={open} onOpenChange={setOpen} title="Business Plan" url="https://docs.google.com/presentation/d/abc/edit" />;
  return <div className="p-4"><SlideViewer url="/vt-harness-deck.pdf" title="Business Plan" /></div>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
