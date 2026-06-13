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
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name");

    if (!error && data) {
      setCompanies(data as Company[]);
      setActiveCompanyIdState((current) => {
        if (current && data.some((c) => c.id === current)) return current;
        const defaultCo = data.find((c) => c.is_default) ?? data[0];
        const fallback = defaultCo?.id ?? null;
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
