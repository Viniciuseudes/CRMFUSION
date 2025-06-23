// crmplataforma/app/client-analytics/page.tsx
"use client";

import { CRMLayout } from "@/components/crm-layout"; //
import { ClientAnalyticsDashboard } from "@/components/client-analytics-dashboard";

export default function ClientAnalyticsPage() {
  return (
    <CRMLayout>
      <ClientAnalyticsDashboard />
    </CRMLayout>
  );
}
