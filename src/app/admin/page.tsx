"use client";

import { useState } from "react";
import { AdminLogin } from "@/features/admin/admin-login";
import { AdminDashboard } from "@/features/admin/admin-dashboard";

/**
 * Admin panel entry route.
 *
 * Rendered at /admin. The page holds the admin API key in local state — the
 * key is never persisted (no localStorage) so reloading the page signs the
 * admin out and forces a fresh login.
 *
 * The key is passed down to all admin feature components which use it in the
 * `Authorization: Bearer <key>` header when calling /api/v1/admin/* routes.
 */
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null);

  if (!adminKey) {
    return <AdminLogin onLogin={setAdminKey} />;
  }

  return (
    <AdminDashboard
      adminKey={adminKey}
      onLogout={() => setAdminKey(null)}
    />
  );
}
