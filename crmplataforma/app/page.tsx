"use client";
// import { useRouter } from "next/navigation"; // Removido pois não é usado diretamente em HomeContent
import { useAuth } from "@/contexts/auth-context"; // [cite: uploaded:health-crm/contexts/auth-context.tsx]
import { CRMLayout } from "@/components/crm-layout"; // [cite: uploaded:health-crm/components/crm-layout.tsx]
import { Dashboard } from "@/components/dashboard"; // [cite: uploaded:health-crm/components/dashboard.tsx]
import { LoginPage } from "@/components/login-page"; // [cite: uploaded:health-crm/components/login-page.tsx]

function HomeContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  // const router = useRouter(); // Remova se não for usar router aqui

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <CRMLayout>
      <Dashboard />
    </CRMLayout>
  );
}

export default function Home() {
  // AuthProvider foi removido daqui, pois já está no RootLayout
  return <HomeContent />;
}
