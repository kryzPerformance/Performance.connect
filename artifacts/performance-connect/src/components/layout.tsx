import React from "react";
import { Link, useLocation } from "wouter";
import { CalendarPlus, ShieldAlert, LayoutDashboard, Database, Activity, Menu, X } from "lucide-react";
import pcLogo from "@assets/pc-logo.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isAdmin = location.startsWith("/admin");

  const navLinks = [
    { href: "/", label: "Events", exact: true },
    { href: "/submit", label: "Submit Event", icon: CalendarPlus },
  ];

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/sources", label: "Sources", icon: Database },
    { href: "/admin/stats", label: "Stats", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 outline-none shrink-0" data-testid="link-home">
            <img
              src={pcLogo}
              alt="Performance Connect"
              className="h-9 w-auto object-contain"
            />
            {/* Wordmark matches PC.ca: "PERFORMANCE" white + "CONNECT" cyan, Rajdhani uppercase */}
            <span
              className="font-heading font-bold tracking-widest text-base uppercase hidden sm:block"
              style={{ letterSpacing: "0.15em" }}
            >
              <span className="text-foreground">PERFORMANCE</span>
              <span className="text-primary">CONNECT</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map((link) => {
              const active = link.exact ? location === link.href : location.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded text-sm font-medium tracking-wide transition-all duration-150 flex items-center gap-2 font-heading uppercase ${
                    active
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                  data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}

            <div className="w-px h-6 bg-border/60 mx-2" />

            <Link
              href="/admin"
              className={`px-4 py-2 rounded text-sm font-heading font-medium tracking-wide uppercase transition-all duration-150 flex items-center gap-2 ${
                isAdmin
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary/30 text-primary hover:bg-primary/10"
              }`}
              data-testid="link-admin"
            >
              <ShieldAlert className="w-4 h-4" />
              Admin
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors ml-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Admin Sub-nav */}
        {isAdmin && (
          <div className="border-t border-border/40 bg-card/60">
            <div className="container mx-auto px-4 h-11 flex items-center gap-1 overflow-x-auto">
              {adminLinks.map((link) => {
                const active = link.exact
                  ? location === link.href
                  : location.startsWith(link.href) && link.href !== "/admin";
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded text-xs font-heading font-medium uppercase tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? "bg-primary/10 text-primary border border-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                    data-testid={`link-admin-${link.label.toLowerCase()}`}
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-sm md:hidden flex flex-col p-4 gap-2 border-t border-border/40">
          {navLinks.map((link) => {
            const active = link.exact ? location === link.href : location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-4 rounded text-base font-heading font-semibold uppercase tracking-wide flex items-center gap-3 transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.icon && <link.icon className="w-5 h-5" />}
                {link.label}
              </Link>
            );
          })}
          <div className="h-px bg-border/60 my-2" />
          <Link
            href="/admin"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`p-4 rounded text-base font-heading font-semibold uppercase tracking-wide flex items-center gap-3 transition-colors ${
              isAdmin
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground"
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

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/40 py-6 mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={pcLogo} alt="Performance Connect" className="h-6 w-auto opacity-70" />
            <span className="text-xs text-muted-foreground font-heading uppercase tracking-widest">
              Performance Connect
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Performance Connect. Canada's Premier Automotive Event Source.
          </p>
        </div>
      </footer>
    </div>
  );
}
