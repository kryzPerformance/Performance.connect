import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Database, Activity, Menu, X, ShieldAlert } from "lucide-react";
import pcLogo from "@assets/pc-logo.png";

const T = {
  black:   "#070808",
  line:    "#23292b",
  cyan:    "#1FA9CF",
  cyanBrt: "#3DC9F0",
  steel:   "#8FA0A6",
  steelDm: "#5C6A6E",
  white:   "#F2F6F7",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location]         = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isAdmin = location.startsWith("/admin");
  const isEvents = location === "/" || location.startsWith("/events") || location === "/submit";

  const adminLinks = [
    { href: "/admin",         label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/sources", label: "Sources",   icon: Database },
    { href: "/admin/stats",   label: "Stats",     icon: Activity },
  ];

  function NavLink({ href, label, isCurrent, external }: { href: string; label: string; isCurrent: boolean; external?: boolean }) {
    const [hov, setHov] = React.useState(false);
    const style: React.CSSProperties = {
      fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.03em",
      color:      isCurrent ? T.cyanBrt : hov ? T.cyanBrt : T.steel,
      textDecoration: "none",
      padding: "8px 16px", borderRadius: 999,
      border: `0.5px solid ${isCurrent ? "rgba(31,169,207,.35)" : hov ? "rgba(31,169,207,.45)" : T.line}`,
      background: isCurrent ? "rgba(31,169,207,.06)" : hov ? "rgba(31,169,207,.07)" : "rgba(255,255,255,.03)",
      transition: "color .15s, border-color .15s, background .15s",
      whiteSpace: "nowrap" as const,
    };
    if (external) {
      return <a href={href} style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{label}</a>;
    }
    return (
      <Link href={href} style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {label}
      </Link>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.black, color: T.white, display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "22px clamp(16px,5vw,56px)", borderBottom: `0.5px solid ${T.line}`,
        flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,8,8,.92)", backdropFilter: "blur(8px)",
      }}>
        {/* Wordmark */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <img src={pcLogo} alt="Performance Connect" style={{ height: 30, width: "auto" }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.18em", color: T.white }}>
            PERFORMANCE<span style={{ color: T.cyanBrt }}>CONNECT</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} className="pc-desktop-nav">
          <NavLink href="https://performanceconnect.ca/marketplace.html" label="Marketplace" isCurrent={false} external />
          <NavLink href="https://performanceconnect.ca/affiliates.html"  label="Affiliates"  isCurrent={false} external />
          <NavLink href="/"            label="Events"    isCurrent={isEvents && !isAdmin} />
          <NavLink href="https://performanceconnect.ca/blog.html"        label="Blog"        isCurrent={false} external />
          <NavLink href="/admin"       label="Admin"     isCurrent={isAdmin} />
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{ background: "none", border: "none", color: T.steel, cursor: "pointer", padding: 8, display: "none" }}
          className="pc-mobile-toggle"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Admin sub-nav */}
      {isAdmin && (
        <div style={{ borderBottom: `0.5px solid ${T.line}`, background: "rgba(17,20,21,.6)" }}>
          <div style={{ padding: "0 clamp(16px,5vw,56px)", height: 44, display: "flex", alignItems: "center", gap: 4, overflowX: "auto" }}>
            {adminLinks.map(link => {
              const active = link.exact ? location === link.href : location.startsWith(link.href) && link.href !== "/admin";
              return (
                <Link key={link.href} href={link.href} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6,
                  fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                  fontFamily: "Rajdhani, sans-serif", textDecoration: "none", whiteSpace: "nowrap",
                  background: active ? "rgba(31,169,207,.1)"  : "transparent",
                  border:     active ? "0.5px solid rgba(31,169,207,.25)" : "0.5px solid transparent",
                  color:      active ? T.cyanBrt : T.steelDm,
                  transition: "all .15s",
                }}>
                  <link.icon size={13} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, top: 73, zIndex: 40, background: "rgba(7,8,8,.98)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", padding: 16, gap: 8, borderTop: `0.5px solid ${T.line}` }}>
          {[
            { href: "https://performanceconnect.ca/marketplace.html", label: "Marketplace", external: true },
            { href: "https://performanceconnect.ca/affiliates.html",  label: "Affiliates",  external: true },
            { href: "/",      label: "Events" },
            { href: "https://performanceconnect.ca/blog.html", label: "Blog", external: true },
            { href: "/admin", label: "Admin" },
          ].map(link => (
            link.external
              ? <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: "Rajdhani, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", color: T.steel, textDecoration: "none" }}>{link.label}</a>
              : <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: "Rajdhani, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", color: T.steel, textDecoration: "none" }}>{link.label}</Link>
          ))}
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 0 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ padding: "24px clamp(16px,5vw,56px)", borderTop: `0.5px solid ${T.line}`, textAlign: "center", fontSize: 12, color: T.steelDm }}>
        Hosting something?{" "}
        <Link href="/submit" style={{ color: T.cyan }}>Submit your event</Link>
        {" "}— free for the Canadian scene. &nbsp;·&nbsp; &copy; {new Date().getFullYear()} Performance Connect
      </footer>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .pc-desktop-nav { display: none !important; }
          .pc-mobile-toggle { display: block !important; }
        }
        .leaflet-popup-content-wrapper {
          background: #111415 !important;
          border: 0.5px solid #23292b !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 24px rgba(0,0,0,.6) !important;
          color: #F2F6F7 !important;
        }
        .leaflet-popup-tip { background: #111415 !important; }
        .leaflet-popup-content { margin: 12px !important; }
        .leaflet-container { font-family: Inter, sans-serif !important; }
        .leaflet-control-attribution { background: rgba(7,8,8,.7) !important; color: #5C6A6E !important; }
        .leaflet-control-attribution a { color: #1FA9CF !important; }
      `}</style>
    </div>
  );
}
