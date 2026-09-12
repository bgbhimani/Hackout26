"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, clearToken, setToken } from "@/lib/api";
import type { FacilityOperatorSignupPayload, User, WasteGeneratorSignupPayload } from "@/types";

interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

/** Client-side auth state: current user (fetched via /api/auth/me once a
 * token exists), plus login/logout and signup actions. */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const me = await apiFetch<User>("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(access_token);
      await loadUser();
      router.push("/dashboard");
    },
    [loadUser, router]
  );

  const registerGenerator = useCallback(
    async (payload: WasteGeneratorSignupPayload) => {
      const { access_token } = await apiFetch<AuthResponse>("/api/auth/register/generator", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToken(access_token);
      await loadUser();
      router.push("/dashboard");
    },
    [loadUser, router]
  );

  const registerFacility = useCallback(
    async (payload: FacilityOperatorSignupPayload) => {
      const { access_token } = await apiFetch<AuthResponse>("/api/auth/register/facility", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToken(access_token);
      await loadUser();
      router.push("/dashboard");
    },
    [loadUser, router]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, loading, login, registerGenerator, registerFacility, logout };
}
