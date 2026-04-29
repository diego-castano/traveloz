"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthProvider } from "./AuthProvider";
import { BrandProvider } from "./BrandProvider";
import { CatalogProvider } from "./CatalogProvider";
import { ServiceProvider } from "./ServiceProvider";
import { PackageProvider } from "./PackageProvider";
import { UserProvider } from "./UserProvider";
import { ToastProvider } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// Composite provider wrapper (client component)
// Composition order: Nuqs > Auth > Brand > Catalog > Service > Package > User > Toast
// Imported in root layout.tsx which remains a server component
// ---------------------------------------------------------------------------
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <AuthProvider>
        <BrandProvider>
          <CatalogProvider>
            <ServiceProvider>
              <PackageProvider>
                <UserProvider>
                  <ToastProvider>{children}</ToastProvider>
                </UserProvider>
              </PackageProvider>
            </ServiceProvider>
          </CatalogProvider>
        </BrandProvider>
      </AuthProvider>
    </NuqsAdapter>
  );
}
