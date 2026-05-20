import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { Role, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-before-production",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [organization()],
});

type SessionLike = {
  user?: {
    email?: string | null;
  } | null;
} | null;

export async function getCurrentUser(): Promise<User | null> {
  const requestHeaders = await headers();
  const session = (await auth.api.getSession({ headers: requestHeaders })) as SessionLike;
  const email = session?.user?.email;
  if (email) {
    return prisma.user.findUnique({ where: { email } });
  }

  if (process.env.NODE_ENV !== "production") {
    return prisma.user.findFirst({ where: { role: Role.COMPANY_ADMIN }, orderBy: { createdAt: "asc" } });
  }

  return null;
}

export async function requireDashboardUser(roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (roles && !roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export function scopedCompanyId(user: User): string {
  if (user.role === Role.SUPER_ADMIN && user.companyId) {
    return user.companyId;
  }
  if (!user.companyId) {
    throw new Error("User is not attached to a company.");
  }
  return user.companyId;
}
