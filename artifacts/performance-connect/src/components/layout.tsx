import React from "react";
import { Link, useLocation } from "wouter";
import { Gauge, CalendarPlus, ShieldAlert, LayoutDashboard, Database, Activity, Menu, X } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isAdmin = location.startsWith("/admin");

  const navLinks = [
    { href: "/", label: "Events", icon: Gauge, exact: true },
    { href: "/submit", label: "Submit Event", icon: CalendarPlus },
  ];

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/sources", label: "Sources", icon: Database },
    { href: "/admin/stats", label: "Stats", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group outline-none" data-testid="link-home">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg uppercase italic text-foreground">
              Performance<span className="text-primary">Connect</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  (link.exact ? location === link.href : location.startsWith(link.href))
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                data-testid={`link-${link.label.toLowerCase().replace(" ", "-")}`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            <div className="w-px h-6 bg-border mx-2" />
            <Link
              href="/admin"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                isAdmin
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              data-testid="link-admin"
            >
              <ShieldAlert className="w-4 h-4" />
              Admin
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Admin Subnav */}
        {isAdmin && (
          <div className="border-t border-border/40 bg-secondary/30">
            <div className="container mx-auto px-4 h-12 flex items-center gap-1 overflow-x-auto">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    (link.exact ? location === link.href : location.startsWith(link.href) && link.href !== "/admin")
                      ? "bg-background shadow-sm text-foreground border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`link-admin-${link.label.toLowerCase()}`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-sm md:hidden flex flex-col p-4 gap-2 border-t border-border/40">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-4 rounded-md text-base font-medium flex items-center gap-3 ${
                (link.exact ? location === link.href : location.startsWith(link.href))
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
          <div className="h-px bg-border my-2" />
          <Link
            href="/admin"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`p-4 rounded-md text-base font-medium flex items-center gap-3 ${
              isAdmin
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground"
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            Admin Dashboard
          </Link>
        </div>
      )}

      <main className="flex-1 flex flex-col relative z-0">
        {children}
      </main>
    </div>
  );
}
