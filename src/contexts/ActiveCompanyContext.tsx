import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Company {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  is_active: boolean;
  is_default: boolean;
}

interface ActiveCompanyContextValue {
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextValue | undefined>(undefined);

const STORAGE_KEY = "cardex:activeCompanyId";

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
  );
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const [{ data: companyData, error }, { data: userData }] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name"),
      supabase.auth.getUser(),
    ]);

    let profileCompanyId: string | null = null;
    if (userData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      profileCompanyId = profile?.company_id ?? null;
    }

    if (!error && companyData) {
      setCompanies(companyData as Company[]);
      setActiveCompanyIdState((current) => {
        if (current && companyData.some((c) => c.id === current)) return current;
        const fallback =
          profileCompanyId && companyData.some((c) => c.id === profileCompanyId)
            ? profileCompanyId
            : (companyData.find((c) => c.is_default) ?? companyData[0])?.id ?? null;
        if (fallback) localStorage.setItem(STORAGE_KEY, fallback);
        return fallback;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const setActiveCompanyId = useCallback((id: string) => {
    setActiveCompanyIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;

  return (
    <ActiveCompanyContext.Provider
      value={{ companies, activeCompany, activeCompanyId, setActiveCompanyId, loading, refetch: fetchCompanies }}
    >
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) throw new Error("useActiveCompany must be used within ActiveCompanyProvider");
  return ctx;
}
