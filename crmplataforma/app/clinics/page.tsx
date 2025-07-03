// crmplataforma/app/clinics/page.tsx
"use client";

import { ClinicsList } from "@/components/clinics-list";

export default function ClinicsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ClinicsList />
    </div>
  );
}
