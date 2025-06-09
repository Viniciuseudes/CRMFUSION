"use client"

import { CRMLayout } from "@/components/crm-layout"
import { ClientsList } from "@/components/clients-list"

export default function ClientsPage() {
  return (
    <CRMLayout>
      <ClientsList />
    </CRMLayout>
  )
}
