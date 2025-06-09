import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // [cite: uploaded:health-crm/app/globals.css]
import { ThemeProvider } from "@/components/theme-provider"; // [cite: uploaded:health-crm/components/theme-provider.tsx]
import { Toaster } from "@/components/ui/toaster"; // Assume que você tem este componente, é comum com shadcn/ui
import { AuthProvider } from "@/contexts/auth-context"; // [cite: uploaded:health-crm/contexts/auth-context.tsx]

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FusionClinic CRM",
  description: "Sistema de gestão para clínicas médicas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* AuthProvider agora envolve todos os children (sua aplicação) */}
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
