import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "super_admin" | "admin" | "moderator" | "member";
export type AccountStatus = "active" | "inactive" | "suspended" | "pending_verification";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AccountRole;
  status: AccountStatus;
  mustChangePassword: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isSuperAdmin: false,
  role: "member",
  status: "active",
  mustChangePassword: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState<AccountRole>("member");
  const [status, setStatus] = useState<AccountStatus>("active");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Resolve role + account status in the background (non-blocking)
    const loadAccount = (userId: string) => {
      setTimeout(async () => {
        if (!mounted) return;

        const [{ data: adminCheck }, { data: profile }, { data: roleRow }] = await Promise.all([
          supabase.rpc("is_super_admin", { _user_id: userId }),
          supabase.from("profiles").select("status, must_change_password").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        ]);

        if (!mounted) return;

        const resolvedRole = ((roleRow as any)?.role ?? "member") as AccountRole;
        const superAdmin = !!adminCheck || resolvedRole === "super_admin";

        setIsAdmin(!!adminCheck || resolvedRole === "admin" || resolvedRole === "super_admin");
        setIsSuperAdmin(superAdmin);
        setRole(superAdmin ? "super_admin" : resolvedRole);
        setStatus((((profile as any)?.status) ?? "active") as AccountStatus);
        setMustChangePassword(!!(profile as any)?.must_change_password);
      }, 0);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        if (event === "SIGNED_IN") {
          loadAccount(session.user.id);
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setRole("member");
        setStatus("active");
        setMustChangePassword(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setLoading(false);

      if (session?.user) {
        loadAccount(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isSuperAdmin,
        role,
        status,
        mustChangePassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
