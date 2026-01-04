import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { ResourceRole, ResourceUserRole } from "@/types/resources";

interface ResourcesContextType {
  resourceRole: ResourceRole;
  assignedSites: string[];
  isResourceAdmin: boolean;
  isResourceSuperAdmin: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ResourcesContext = createContext<ResourcesContextType>({
  resourceRole: "member",
  assignedSites: [],
  isResourceAdmin: false,
  isResourceSuperAdmin: false,
  loading: true,
  refetch: async () => {},
});

export function ResourcesProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [resourceRole, setResourceRole] = useState<ResourceRole>("member");
  const [assignedSites, setAssignedSites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setResourceRole("member");
      setAssignedSites([]);
      setLoading(false);
      return;
    }

    try {
      // If user is super admin in the main system, they're super_admin in resources too
      if (isAdmin) {
        setResourceRole("super_admin");
        setAssignedSites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("resource_user_roles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching resource role:", error);
      }

      if (data) {
        setResourceRole((data as ResourceUserRole).role);
        setAssignedSites((data as ResourceUserRole).assigned_sites || []);
      } else {
        setResourceRole("member");
        setAssignedSites([]);
      }
    } catch (err) {
      console.error("Error in fetchRole:", err);
      setResourceRole("member");
      setAssignedSites([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const isResourceAdmin = resourceRole === "admin" || resourceRole === "super_admin" || isAdmin;
  const isResourceSuperAdmin = resourceRole === "super_admin" || isAdmin;

  return (
    <ResourcesContext.Provider
      value={{
        resourceRole,
        assignedSites,
        isResourceAdmin,
        isResourceSuperAdmin,
        loading,
        refetch: fetchRole,
      }}
    >
      {children}
    </ResourcesContext.Provider>
  );
}

export function useResources() {
  return useContext(ResourcesContext);
}
