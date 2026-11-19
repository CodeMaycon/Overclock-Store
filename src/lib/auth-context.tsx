"use client";

import React, { createContext, useContext } from "react";
import { SessionProvider, useSession, signOut, signIn } from "next-auth/react";
import { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  isBanned?: boolean;
  discordId?: string | null;
  isDiscordVerified?: boolean;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (provider?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

function AuthContextConsumerBridge({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const user: AuthenticatedUser | null = session?.user
    ? {
        id: session.user.id || "",
        username: session.user.username || session.user.email?.split("@")[0] || "user",
        fullName: session.user.fullName || session.user.name || "Usuário",
        email: session.user.email || "",
        role: (session.user.role as Role) || "CUSTOMER",
        isBanned: session.user.isBanned || false,
        discordId: session.user.discordId || null,
        isDiscordVerified: session.user.isDiscordVerified || false,
        avatarUrl: session.user.avatarUrl || session.user.image || null,
      }
    : null;

  const isLoggedIn = status === "authenticated" && !!user;
  const isLoading = status === "loading";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleLogin = async (provider?: string) => {
    if (provider) {
      await signIn(provider);
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextConsumerBridge>{children}</AuthContextConsumerBridge>
    </SessionProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
