import { createRoot } from "react-dom/client";
import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import ToolsDrawer from "@/components/tools/ToolsDrawer";

function Harness() {
  const [open, setOpen] = useState(true);
  const [section, setSection] = useState<string | null>(new URLSearchParams(location.search).get("s"));
  const items = [{ id: "links", label: "Quick Links", icon_name: "Link", route: "", image_url: null }, { id: "files", label: "Files", icon_name: "File", route: "", image_url: null }] as any;
  return <><p id="state">{open ? "open" : "closed"}</p><ToolsDrawer open={open} onOpenChange={setOpen} activeSection={section} onSectionChange={setSection} items={items} /></>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient()}><BrowserRouter><Harness /></BrowserRouter></QueryClientProvider>);
