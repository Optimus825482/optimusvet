import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Get authenticated user from session in API routes
 * This works around NextAuth v5 middleware edge runtime issues
 */
export async function getAuthUser(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
  } catch (error) {
    console.error("Auth error in API route:", error);
    return null;
  }
}

/**
 * Require authentication in API routes
 * Returns user or throws 401 error
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
