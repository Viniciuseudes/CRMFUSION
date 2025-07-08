"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import {
  BarChart3,
  Users,
  UserPlus,
  Target,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Home,
  LineChart,
  FileText,
  Database,
  Building, // Usando um ícone diferente para Clínicas para evitar repetição
} from "lucide-react";

interface CRMLayoutProps {
  children: React.ReactNode;
}

export function CRMLayout({ children }: CRMLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Leads", href: "/leads", icon: UserPlus },
    { name: "BaseX", href: "/basex", icon: Database },
    { name: "Clientes", href: "/clients", icon: Users },
    { name: "Clinicas", href: "/clinics", icon: Building },
    { name: "Relatórios", href: "/reports", icon: BarChart3 },
    { name: "Metas", href: "/goals", icon: Target },
    { name: "Equipe", href: "/team", icon: Users },
    { name: "Contratos", href: "/contracts", icon: FileText },
    { name: "Análise Clientes", href: "/client-analytics", icon: LineChart },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  const getVisibleNavigation = () => {
    if (!user) return [];

    // --- INÍCIO DA CORREÇÃO ---
    if (user.role === "colaborador") {
      const allowedHrefs = [
        "/leads",
        "/clients",
        "/basex",
        "/clinics",
        "/goals",
      ];
      return navigation.filter((item) => allowedHrefs.includes(item.href));
    }
    // --- FIM DA CORREÇÃO ---

    // Para admin e gerente, mostra tudo (ou a lógica que preferir)
    return navigation;
  };

  const visibleNavigation = getVisibleNavigation();

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <div
          className={`
            fixed inset-y-0 left-0 z-30
            flex flex-col bg-white dark:bg-gray-800 shadow-lg
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? "w-64" : "w-0 md:w-16"} 
            overflow-hidden md:overflow-visible md:relative md:translate-x-0
          `}
        >
          <Sidebar
            className={`flex-1 flex flex-col border-r dark:border-gray-700 ${
              !isSidebarOpen && "md:items-center"
            }`}
          >
            <SidebarContent className="flex-1 flex flex-col">
              <div className="flex h-16 items-center px-4 md:px-6 border-b dark:border-gray-700 shrink-0">
                <div
                  className={`flex items-center space-x-2 ${
                    !isSidebarOpen && "md:justify-center md:w-full"
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                    FC
                  </div>
                  {isSidebarOpen && (
                    <span className="font-semibold text-lg text-gray-800 dark:text-white">
                      FusionClinic
                    </span>
                  )}
                </div>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {visibleNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Button
                      key={item.name}
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start text-sm ${
                        !isSidebarOpen && "md:justify-center"
                      }`}
                      onClick={() => {
                        router.push(item.href);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      title={item.name}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          !isSidebarOpen && "md:mr-0"
                        }`}
                      />
                      {isSidebarOpen && item.name}
                    </Button>
                  );
                })}
              </nav>
            </SidebarContent>
          </Sidebar>
        </div>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6 shrink-0">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="mr-2 h-8 w-8"
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <div className="relative w-full max-w-xs hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 h-9 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4">
              <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
                <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={
                          user?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user?.name || "U"
                          )}&background=random`
                        }
                        alt={user?.name}
                      />
                      <AvatarFallback>
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
