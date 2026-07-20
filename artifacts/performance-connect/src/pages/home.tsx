import React from "react";
import { Link, useLocation } from "wouter";
import { useListEvents } from "@workspace/api-client-react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ── Leaflet icon fix ────────────────────────────────────────────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

// ── Brand tokens (match the HTML exactly) ───────────────────────────────────
const T = {
  black:   "#070808",
  panel:   "#111415",
  panel2:  "#161B1C",
  line:    "#23292b",
  cyan:    "#1FA9CF",
  cyanBrt: "#3DC9F0",
  steel:   "#8FA0A6",
  steelDm: "#5C6A6E",
  white:   "#F2F6F7",
  green:   "#3DF08A",
  red:     "#E84545",
  amber:   "#F0B83D",
};

// ── Event type metadata ──────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string }> = {
  meet:   { label: "Meet",          color: "#3DC9F0" },
  track:  { label: "Track Day",     color: "#FF4DA6" },
  show:   { label: "Car Show",      color: "#FFD600" },
  coffee: { label: "Cars & Coffee", color: "#FF8C42" },
  other:  { label: "Event",         color: "#B34DFF" },
};

const MONTHS      = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type EventTypeKey = "meet" | "track" | "show" | "coffee" | "other";
type ViewMode     = "list" | "calendar" | "map";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTypeKey(categories: string[] | null | undefined): EventTypeKey {
  // Categories are an ordered list; the first entry is the event's primary category.
  // Map each string with coffee checked before meet ("Cars and Coffee" must not match "meet").
  const mapOne = (raw: string): EventTypeKey | null => {
    const c = raw.toLowerCase();
    if (c.includes("coffee")) return "coffee";
    if (c.includes("track"))  return "track";
    if (c.includes("show"))   return "show";
    if (c.includes("meet"))   return "meet";
    return null;
  };
  for (const raw of categories ?? []) {
    const key = mapOne(raw ?? "");
    if (key) return key;
    break; // only the primary (first) category decides; others are secondary tags
  }
  return "other";
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  return `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
}

function makeEvIcon(typeKey: EventTypeKey) {
  const { color } = TYPE_META[typeKey];
  const html = `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${color}22;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,.6);">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${color}" stroke-width="2.2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg></div>`;
  return L.divIcon({ className: "", html, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16] });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function EventCard({ ev }: { ev: any }) {
  const [hovered, setHovered] = React.useState(false);
  const [, navigate] = useLocation();
  const typeKey  = getTypeKey(ev.categories);
  const meta     = TYPE_META[typeKey];
  const d        = ev.startDate ? new Date(ev.startDate + "T00:00:00") : null;
  const timeStr  = ev.startTime
    ? fmtTime(ev.startTime) + (ev.endTime ? ` – ${fmtTime(ev.endTime)}` : "")
    : "";
  const loc      = ev.venueName || ev.city || "";
  const hasPoster = !!ev.flyerUrl;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/events/${ev.id}`)}
      onKeyDown={e => e.key === "Enter" && navigate(`/events/${ev.id}`)}
      style={{
        display: "grid",
        gridTemplateColumns: hasPoster ? "64px 1fr 120px" : "64px 1fr",
        gap: 16,
        background: T.panel,
        border: `0.5px solid ${hovered ? "rgba(31,169,207,.4)" : T.line}`,
        borderRadius: 14,
        padding: 18,
        color: "inherit",
        cursor: "pointer",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "border-color .15s, transform .15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Date badge */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        background: T.panel2, borderRadius: 10, padding: "8px 4px", height: 64 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.cyanBrt }}>
          {d ? MONTHS[d.getMonth()] : "TBA"}
        </span>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 26, lineHeight: 1, color: T.white }}>
          {d ? d.getDate() : "--"}
        </span>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        {/* Type tag */}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "3px 9px", borderRadius: 999,
          background: meta.color + "18", color: meta.color,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
          {meta.label}
        </span>

        {/* Title — a real link for semantics (open in new tab, copy address, a11y) */}
        <Link
          href={`/events/${ev.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 19, lineHeight: 1.15,
            color: T.white, textDecoration: "none" }}
        >
          {ev.title}
        </Link>

        {/* Meta row */}
        <div style={{ fontSize: 12.5, color: T.steel, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {timeStr && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={T.steelDm} strokeWidth={2}>
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
              </svg>
              {timeStr}
            </span>
          )}
          {loc && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={T.steelDm} strokeWidth={2}>
                <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              {loc}
            </span>
          )}
          {ev.organizer && <span>by {ev.organizer}</span>}
        </div>

        {/* Description */}
        {ev.description && (
          <div style={{
            fontSize: 13, color: T.steel, lineHeight: 1.5, marginTop: 2,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {ev.description}
          </div>
        )}

        {/* Links */}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {ev.sourceUrl && (
            <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 7, textDecoration: "none",
                background: "rgba(31,169,207,.1)", border: "0.5px solid rgba(31,169,207,.3)", color: T.cyanBrt }}>
              Event details
            </a>
          )}
          {ev.latitude && ev.longitude && (
            <a href={`https://maps.google.com/?q=${ev.latitude},${ev.longitude}`}
              target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 7, textDecoration: "none",
                border: `0.5px solid ${T.line}`, color: T.steel }}>
              Directions
            </a>
          )}
          {ev.entryFee && ev.entryFee !== "Free" && (
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 7,
              border: `0.5px solid ${T.line}`, color: T.steelDm }}>
              {ev.entryFee}
            </span>
          )}
        </div>
      </div>

      {/* Poster image */}
      {hasPoster && (
        <div style={{ width: 120, borderRadius: 10, overflow: "hidden", background: T.panel2, border: `0.5px solid ${T.line}`, alignSelf: "stretch" }}>
          <img src={ev.flyerUrl} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}
    </div>
  );
}

function EventList({ events, allEmpty }: { events: any[]; allEmpty: boolean }) {
  if (allEmpty) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: T.steelDm, maxWidth: 480, margin: "0 auto" }}>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={T.line} strokeWidth={1.5} style={{ margin: "0 auto 16px", display: "block" }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 20, color: T.steel, marginBottom: 8, textTransform: "uppercase" }}>
          No events yet
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          Nothing on the calendar right now. Hosting a meet, track day, or show?{" "}
          <Link href="/submit" style={{ color: T.cyan }}>Submit it here</Link>{" "}
          and get it in front of the Canadian scene.
        </p>
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: T.steelDm, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 20, color: T.steel, marginBottom: 8, textTransform: "uppercase" }}>
          No events match your filters
        </div>
        <p style={{ fontSize: 13.5 }}>Try enabling more event types above.</p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
      {events.map(ev => <EventCard key={ev.id} ev={ev} />)}
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────
function CalendarView({ events }: { events: any[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = events[0] ? new Date(events[0].startDate + "T00:00:00") : new Date();
  const [year,  setYear]  = React.useState(first.getFullYear());
  const [month, setMonth] = React.useState(first.getMonth());

  const byDate: Record<string, any[]> = {};
  events.forEach(ev => {
    if (ev.startDate) (byDate[ev.startDate] = byDate[ev.startDate] || []).push(ev);
  });

  const startDow   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const next = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1);

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", letterSpacing: "0.03em", color: T.white }}>
          {MONTHS_FULL[month]} {year}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([["prev", prev, "M15 18l-6-6 6-6"], ["next", next, "M9 18l6-6-6-6"]] as const).map(([id, fn, path]) => (
            <button key={id} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, background: T.panel, border: `0.5px solid ${T.line}`, color: T.steel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d={path} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.steelDm, padding: "6px 0" }}>{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = new Date(year, month, day).getTime() === today.getTime();
          const dayEvs  = byDate[dateStr] || [];
          return (
            <div key={day} style={{
              aspectRatio: "1", background: T.panel,
              border: `0.5px solid ${isToday ? "rgba(31,169,207,.5)" : T.line}`,
              borderRadius: 8, padding: 5, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden", minHeight: 52,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? T.cyanBrt : T.steel }}>{day}</span>
              {dayEvs.slice(0, 2).map((ev: any) => {
                const { color } = TYPE_META[getTypeKey(ev.categories)];
                return (
                  <div key={ev.id} style={{ fontSize: 9, fontWeight: 600, padding: "2px 4px", borderRadius: 4, lineHeight: 1.2,
                    background: color + "22", color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    title={ev.title}>{ev.title}</div>
                );
              })}
              {dayEvs.length > 2 && (
                <div style={{ fontSize: 9, color: T.steelDm, paddingLeft: 2 }}>+{dayEvs.length - 2} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────
function FitBounds({ events }: { events: any[] }) {
  const map = useMap();
  React.useEffect(() => {
    const pts = events.filter(ev => ev.latitude && ev.longitude).map(ev => [ev.latitude, ev.longitude] as [number, number]);
    if (pts.length > 1) map.fitBounds(pts, { padding: [50, 50] });
    else if (pts.length === 1) map.setView(pts[0], 12);
  }, [events, map]);
  return null;
}

function MapView({ events }: { events: any[] }) {
  const GTA: [number, number] = [43.7184, -79.5181];
  const withCoords = events.filter(ev => ev.latitude && ev.longitude);
  return (
    <MapContainer center={GTA} zoom={6} style={{ width: "100%", height: "100%", background: "#0a0f10" }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {withCoords.map(ev => {
        const typeKey = getTypeKey(ev.categories);
        const meta    = TYPE_META[typeKey];
        const d       = ev.startDate ? new Date(ev.startDate + "T00:00:00") : null;
        const timeStr = ev.startTime ? fmtTime(ev.startTime) : "";
        return (
          <Marker key={ev.id} position={[ev.latitude, ev.longitude]} icon={makeEvIcon(typeKey)}>
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 180 }}>
                {ev.flyerUrl && (
                  <img src={ev.flyerUrl} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />
                )}
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 16, color: "#F2F6F7", marginBottom: 4 }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: meta.color, fontWeight: 600, marginBottom: 6 }}>
                  {meta.label}{d ? ` · ${MONTHS[d.getMonth()]} ${d.getDate()}` : ""}{timeStr ? ` · ${timeStr}` : ""}
                </div>
                {ev.venueName && <div style={{ fontSize: 12, color: "#8FA0A6" }}>{ev.venueName}</div>}
                {ev.sourceUrl && <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3DC9F0" }}>Event details →</a>}
              </div>
            </Popup>
          </Marker>
        );
      })}
      <FitBounds events={withCoords} />
    </MapContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = React.useState<ViewMode>("list");
  const [activeTypes, setActiveTypes] = React.useState<Record<EventTypeKey, boolean>>({
    meet: true, track: true, show: true, coffee: true, other: true,
  });

  const { data, isLoading } = useListEvents({ limit: 200 });
  const allEvents = (data?.events ?? []) as any[];
  const visible   = allEvents.filter(ev => activeTypes[getTypeKey(ev.categories)]);
  const allOn     = Object.values(activeTypes).every(Boolean);

  const toggleType = (type: EventTypeKey | "all") => {
    if (type === "all") {
      const next = !allOn;
      setActiveTypes({ meet: next, track: next, show: next, coffee: next, other: next });
    } else {
      setActiveTypes(prev => ({ ...prev, [type]: !prev[type] }));
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {/* ── Hero ── */}
      <div style={{ padding: "32px clamp(16px,5vw,56px) 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: T.cyan }}>
          Canadian Car Culture
        </div>
        <h1 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontStyle: "italic",
          fontSize: "clamp(28px,5vw,42px)", textTransform: "uppercase", letterSpacing: "0.01em", lineHeight: 1.05, color: T.white, margin: 0 }}>
          Upcoming <span style={{ color: T.cyanBrt }}>Events</span>
        </h1>
        <p style={{ fontSize: 14.5, color: T.steel, maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
          Meets, track days, shows, and cars &amp; coffee across Canada. Find your next drive — or submit your own event to get it on the map.
        </p>
        <Link href="/submit" style={{
          display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start", marginTop: 4,
          padding: "10px 18px", borderRadius: 999, background: T.cyanBrt, color: "#03171D",
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em",
          textTransform: "uppercase", textDecoration: "none",
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Submit an event
        </Link>
      </div>

      {/* ── Controls ── */}
      <div style={{ padding: "8px clamp(16px,5vw,56px) 4px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

          {/* Filter pills */}
          {(["all", "meet", "track", "show", "coffee", "other"] as const).map(type => {
            const isAll   = type === "all";
            const active  = isAll ? allOn : activeTypes[type as EventTypeKey];
            const color   = isAll ? T.steel : TYPE_META[type]?.color ?? T.steel;
            const label   = isAll ? "All" : TYPE_META[type]?.label ?? type;
            return (
              <button key={type} onClick={() => toggleType(type)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                  background: active ? color + "1E" : "#0D1012",
                  border:     `1px solid ${active ? color + "66" : "#1C2225"}`,
                  color:      active ? color : T.steelDm,
                  transition: "background .2s, border-color .2s, color .2s",
                }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                {label}
              </button>
            );
          })}

          {/* 3-way view toggle */}
          <div style={{ display: "flex", gap: 4, background: T.panel, border: `0.5px solid ${T.line}`, borderRadius: 999, padding: 4, marginLeft: "auto" }}>
            {(["list", "calendar", "map"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: view === v ? "rgba(31,169,207,.14)" : "none",
                color:      view === v ? T.cyanBrt : T.steelDm,
                transition: "all .15s",
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Count line ── */}
      <div style={{ fontSize: 13, color: T.steelDm, padding: "6px clamp(16px,5vw,56px)" }}>
        {!isLoading && allEvents.length > 0 && (
          <>Showing <span style={{ color: T.cyanBrt, fontWeight: 700 }}>{visible.length}</span> upcoming event{visible.length !== 1 ? "s" : ""}</>
        )}
        {!isLoading && allEvents.length === 0 && <span>&nbsp;</span>}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "16px clamp(16px,5vw,56px) 60px" }}>

        {/* Loading spinner */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: T.steelDm }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${T.line}`, borderTopColor: T.cyanBrt,
              borderRadius: "50%", animation: "pc-spin 0.7s linear infinite", margin: "0 auto 14px" }} />
            Loading events...
          </div>
        )}

        {/* List */}
        {!isLoading && view === "list" && (
          <EventList events={visible} allEmpty={allEvents.length === 0} />
        )}

        {/* Calendar */}
        {!isLoading && view === "calendar" && (
          <CalendarView events={visible} />
        )}

        {/* Map — keep mounted but hidden so Leaflet doesn't re-init */}
        {!isLoading && (
          <div style={{
            display: view === "map" ? "block" : "none",
            borderRadius: 14, overflow: "hidden", border: `0.5px solid ${T.line}`, height: 560,
          }}>
            <MapView events={visible} />
          </div>
        )}
      </div>

      <style>{`@keyframes pc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
