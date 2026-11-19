import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
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

  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      fullName: string;
      email: string;
      role: Role;
      isBanned?: boolean;
      discordId?: string | null;
      isDiscordVerified?: boolean;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    isBanned?: boolean;
    discordId?: string | null;
    isDiscordVerified?: boolean;
    avatarUrl?: string | null;
  }
}
