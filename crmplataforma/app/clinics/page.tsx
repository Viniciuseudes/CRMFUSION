"use client";

import { CRMLayout } from "@/components/crm-layout";
import { ClinicsList } from "@/components/clinics-list";

export default function ClinicsPage() {
  return (
    <CRMLayout>
      <ClinicsList />
    </CRMLayout>
  );
}
