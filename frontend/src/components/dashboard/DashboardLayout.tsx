import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { branding } from "../../config/branding";

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    {
      name: "Overview",
      to: "/dashboard",
      icon: LayoutDashboard,
      end: true,
    },
    {
      name: "Leads",
      to: "/dashboard/leads",
      icon: Users,
      end: false,
    },
    ...(user?.role === "owner" || user?.role === "admin"
      ? [
          {
            name: "Settings",
            to: "/dashboard/settings",
            icon: Settings,
            end: false,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight leading-tight">
              {branding.companyName}
            </div>
            <div className="text-xs text-amber-400 font-medium">Owner Portal</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop Persistent / Mobile Drawer) */}
      <aside
        ref={mobileMenuRef}
        className={`fixed md:sticky top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white truncate" title={branding.companyName}>
                {branding.companyName}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Owner Dashboard
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5" aria-label="Dashboard Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-amber-500 text-slate-950 shadow-md font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>View Public Website</span>
                </span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                  New tab
                </span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User Identity & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-medium text-white truncate" title={user?.fullName || "Owner"}>
                {user?.fullName || "Owner Account"}
              </div>
              <div className="text-xs text-slate-400 truncate" title={user?.email}>
                {user?.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <main className="flex-1 min-w-0 bg-slate-950 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
