"use client";

// ---------------------------------------------------------------------------
// Root page -- redirects to admin or login based on authentication state
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export default function RootPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard"); // Default landing page
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  return null; // Brief blank while redirecting
}
