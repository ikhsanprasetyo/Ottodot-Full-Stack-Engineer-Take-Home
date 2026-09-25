'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCardIcon, MenuIcon, XIcon, ZapIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from './logo';
import { isAuthenticated } from '@/lib/api/isAuthenticated';
import { Button } from './button';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(isAuthenticated());
  }, [isAuth]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'About', icon: <ZapIcon className="w-4 h-4" /> },
    { name: 'FAQ', icon: <CreditCardIcon className="w-4 h-4" /> }
  ];

  return (
    <header
      className={cn(
        'fixed w-full z-50 transition-all duration-300',
        scrolled
          ? 'bg-black/80 backdrop-blur-md border-b border-green-500/30'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-4 md:py-6">
          <Logo />
          <nav className="hidden md:flex items-center space-x-8">
            {navItems?.map((item) => (
              <a
                key={item.name}
                href={`#${item.name.toLowerCase()}`}
                className="group flex items-center text-sm font-medium text-gray-300 hover:text-green-400 transition-colors relative"
              >
                <span className="absolute -left-3 opacity-0 group-hover:opacity-100 transition-opacity text-green-500">
                  &gt;
                </span>
                <span className="mr-1.5">{item.icon}</span>
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-green-400 group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
          </nav>
          {/* ✅ Tampilkan tombol di desktop */}

          <div className="hidden md:block">
            <Button
              className="w-56"
              variant="green"
              href={isAuth ? '/dashboard' : '/login'}
            >
              {isAuth ? 'Go to Dashboard' : 'Get Started'}
            </Button>
          </div>

          {/* ✅ Mobile menu toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none cursor-pointer"
            >
              {isMenuOpen ? (
                <XIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-black/95 backdrop-blur-lg border-t border-green-500/30"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              {navItems?.map((item) => (
                <a
                  key={item.name}
                  href={`#${item.name.toLowerCase()}`}
                  className="flex items-center py-3 px-3 text-gray-300 hover:text-green-400 hover:bg-green-900/20 rounded-sm transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3 text-green-500">{item.icon}</span>
                  {item.name}
                </a>
              ))}
              {/* ✅ Tampilkan tombol di mobile */}

              <div className="pt-2">
                <Button variant="green" href={isAuth ? '/dashboard' : '/login'}>
                  {isAuth ? 'Go to Dashboard' : 'Get Started'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
    </header>
  );
};
