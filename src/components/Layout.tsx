import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Warehouse, Truck, Settings, FileText, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/inventory', icon: Warehouse, label: 'Stock' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-600 text-white px-3 py-2 shadow-lg fixed top-0 left-0 right-0 z-50 md:static">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 -ml-1"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
            <h1 className="text-lg font-bold flex items-center gap-2">
              PharmaFlow
            </h1>
          </div>
          {isMobile && (
            <span className="text-teal-200 text-xs">
              {navItems.find(n => n.to === location.pathname)?.label}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex pt-14 md:pt-0">
        {!isMobile && (
          <nav className="w-48 lg:w-56 bg-white border-r border-slate-200 min-h-screen fixed md:relative">
            <ul className="py-2 lg:py-4">
              {navItems.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 lg:py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon size={18} className="lg:w-5 lg:h-5" />
                    <span className="hidden lg:inline">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {isMobile && mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 pt-14" onClick={() => setMobileMenuOpen(false)}>
            <nav
              className="w-64 bg-white h-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <ul className="py-2">
                {navItems.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon size={20} />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        <main className="flex-1 p-3 md:p-6 min-h-screen pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-bottom">
          <div className="flex justify-around py-1">
            {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                    isActive
                      ? 'text-teal-600'
                      : 'text-slate-500'
                  }`
                }
              >
                <Icon size={20} />
                <span className="mt-0.5">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}