'use client';

import { useRef, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Providers from '@/components/layout/dashboard/providers';
import DesktopNav from '@/components/layout/dashboard/desktop-nav';
import MobileNav from '@/components/layout/dashboard/mobile-nav';
import DashboardBreadcrumb from '@/components/layout/dashboard/dashboard-breadcrumb';
import { User } from '@/components/layout/dashboard/user';
import { useAuthRedirect } from '@/lib/hooks/useAuthRedirect';
import { AccessGuard } from '@/components/auth/access-guard';
import LoadingSpinner from '@/components/ui/loading-spinner';
import {
  getLocalStorageSettings,
  isBoolean,
  updateLocalStorageSettings
} from '@/lib/localStorage';
import { RTUAIChatbot } from '@/components/shared/rtu-ai-chatbot';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export default function DashboardLayout({
  isLoading = false,
  children
}: {
  isLoading?: boolean;
  children: React.ReactNode;
}) {
  useAuthRedirect(true, '/');

  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = getLocalStorageSettings(
        'ui',
        'sidebarCollapsed',
        isBoolean
      );
      if (saved !== null) return saved;
    }
    return false;
  });
  const [enableTransition, setEnableTransition] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Scroll to top on every route change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    // Also reset window and document body just in case of secondary overflows
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [pathname]);

  const handleToggle = () => {
    setEnableTransition(true); // ✅ aktifkan animasi saat toggle
    setNavCollapsed((prev) => {
      const next = !prev;
      updateLocalStorageSettings('ui', 'sidebarCollapsed', next);
      return next;
    });
  };

  useEffect(() => {
    setShowSpinner(isLoading);
  }, [isLoading]);

  return (
    <Providers>
      <main className="flex flex-1 flex-col bg-muted/40 overflow-x-hidden w-full">
        {showSpinner && <LoadingSpinner />}
        <DesktopNav collapsed={navCollapsed} onToggle={handleToggle} />
        <div
          className={`flex flex-col ${
            enableTransition
              ? 'transition-[padding] duration-300 easy-in-out'
              : ''
          } ${navCollapsed ? 'sm:pl-16' : 'sm:pl-60'}`}
        >
          <header className="flex items-center border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <MobileNav />
            <DashboardBreadcrumb />
            <div className="ml-auto mb-1 mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiOpen(true)}
                className="h-8 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-sm gap-1.5 shadow-2xs cursor-pointer"
                title="Buka AI RTU Analyst"
                icon={
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                }
              >
                AI Analyst
              </Button>
              <User />
            </div>
          </header>
          <main
            ref={scrollContainerRef}
            className="flex-1 p-4 sm:px-6 sm:py-0 bg-muted/40 overflow-y-auto"
          >
            <div
              className={`min-h-[calc(100vh-4rem)] w-full transition-all duration-300 ease-in-out`}
            >
              <AccessGuard>{children}</AccessGuard>
            </div>
          </main>
        </div>

        <RTUAIChatbot isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      </main>
    </Providers>
  );
}
