import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import templates from "@/lib/__fixtures__/industryTemplates.json";
import { TEMPLATE_INDUSTRIES } from "@/lib/templateIndustries";
import { TemplateSelectionModal } from "./TemplateSelectionModal";
import { ChangeTemplateDialog } from "./ChangeTemplateDialog";
import type { Tables } from "@/integrations/supabase/types";

const { updates } = vi.hoisted(() => ({ updates: [] as Record<string, unknown>[] }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" }, isAdmin: false }) }));
vi.mock("@/hooks/useTemplates", () => ({ useTemplates: () => ({ templates: templates.map((t, i) => ({ ...t, id: String(i), owner_id: "admin", visibility: "global" })), loading: false }) }));
vi.mock("./TemplatePreviewDialog", () => ({ TemplatePreviewDialog: () => null }));
vi.mock("./EditTemplateDialog", () => ({ EditTemplateDialog: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ update: (payload: Record<string, unknown>) => {
  updates.push(payload);
  return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: "existing" }, error: null }) }) }) };
} }) } }));
afterEach(cleanup);

describe("industry selection in onboarding and existing cards", () => {
  for (const industry of TEMPLATE_INDUSTRIES) {
    it(`${industry.key}: the onboarding picker selects the correct design`, () => {
      const select = vi.fn();
      render(<TemplateSelectionModal open onOpenChange={() => {}} onSelectTemplate={select} onBuildFromScratch={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: industry.label }));
      const template = templates.find(t => t.category === industry.key);
      if (!template) throw new Error("Missing industry fixture");
      fireEvent.click(screen.getByText(template.name, { exact: true }));
      expect(select).toHaveBeenCalledWith(expect.objectContaining({ category: industry.key, layout_data: expect.objectContaining({ cover_url: template.layout_data.cover_url, theme: template.layout_data.theme }) }));
    });
    it(`${industry.key}: confirmation applies only design fields to the existing card`, async () => {
      const applied = vi.fn();
      render(<ChangeTemplateDialog card={{ id: "existing", full_name: "Ana Santos", email: "ana@example.test" } as Tables<"cards">} open onOpenChange={() => {}} onApplied={applied} />);
      fireEvent.click(screen.getByRole("button", { name: industry.label }));
      const template = templates.find(t => t.category === industry.key);
      if (!template) throw new Error("Missing industry fixture");
      fireEvent.click(screen.getByText(template.name, { exact: true }));
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Apply Template" })); });
      expect(applied).toHaveBeenCalledOnce();
      expect(updates.at(-1)).not.toHaveProperty("email");
      expect(updates.at(-1)).not.toHaveProperty("full_name");
      expect(updates.at(-1)).toMatchObject({ showcase_display_mode: "immersive", carousel_settings: template.layout_data.carousel_settings, cover_url: template.layout_data.cover_url, theme: template.layout_data.theme });
    });
  }
});