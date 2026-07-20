import React from "react";
import { Link } from "wouter";
import { useListEvents, useListUpcomingEvents } from "@workspace/api-client-react";
import { MapPin, Calendar, Users, Zap, ShieldCheck, Flame, List, Map as MapIcon, Search, SearchX, CalendarPlus, Gauge } from "lucide-react";
import { format } from "date-fns";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

// Custom Red Icon for automotive theme
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Home() {
  const [viewMode, setViewMode] = React.useState<"list" | "map">("list");
  const [search, setSearch] = React.useState("");
  const [province, setProvince] = React.useState("");
  const [category, setCategory] = React.useState("");

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: eventsData, isLoading } = useListEvents({
    search: debouncedSearch || undefined,
    province: province || undefined,
    category: category || undefined,
    limit: 50
  });

  const events = eventsData?.events || [];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/40 py-16 md:py-24">
        {/* Background texture/noise/gradient */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-6">
            <Flame className="w-4 h-4" />
            <span>Canada's Premier Automotive Event Source</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-foreground max-w-4xl uppercase italic">
            Find Your Next <span className="text-primary pc-glow-text">Adrenaline</span> Fix
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10">
            The command center for Canadian car culture. Track days, drag races, burnout contests, and car meets. Community powered.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Link 
              href="/submit" 
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-md font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              data-testid="link-hero-submit"
            >
              <CalendarPlus className="w-5 h-5" />
              Submit Event
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex flex-col gap-6 shrink-0">
          <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-5">
            <h3 className="font-bold text-lg border-b border-border/50 pb-2">Filters</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Event name or city..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-input rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Province</label>
              <select 
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none"
                data-testid="select-province"
              >
                <option value="">All Provinces</option>
                <option value="ON">Ontario</option>
                <option value="QC">Quebec</option>
                <option value="BC">Quebec</option>
                <option value="AB">British Columbia</option>
                <option value="MB">Alberta</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none"
                data-testid="select-category"
              >
                <option value="">All Categories</option>
                <option value="Car Show">Car Show</option>
                <option value="Car Meet">Car Meet</option>
                <option value="Track Day">Track Day</option>
                <option value="Drag Racing">Drag Racing</option>
                <option value="Drifting">Drifting</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold">
              {isLoading ? "Loading..." : `${events.length} Events Found`}
            </h2>
            
            <div className="flex bg-secondary p-1 rounded-md border border-border/50">
              <button 
                onClick={() => setViewMode("list")}
                className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="btn-view-list"
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button 
                onClick={() => setViewMode("map")}
                className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all ${viewMode === "map" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="btn-view-map"
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl h-64 animate-pulse"></div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card border border-border border-dashed rounded-xl text-center">
              <SearchX className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">No events found</h3>
              <p className="text-muted-foreground max-w-md">
                We couldn't find any events matching your filters. Try adjusting your search or check back later.
              </p>
              <button 
                onClick={() => { setSearch(""); setProvince(""); setCategory(""); }}
                className="mt-6 text-primary hover:underline text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : viewMode === "list" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="group outline-none" data-testid={`event-card-${event.id}`}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(220,38,38,0.15)] flex flex-col h-full group-focus-visible:ring-2 ring-primary">
                    {/* Image Area */}
                    <div className="h-48 bg-secondary relative overflow-hidden flex-shrink-0">
                      {event.flyerUrl ? (
                        <img 
                          src={event.flyerUrl} 
                          alt={event.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <Gauge className="w-16 h-16 text-zinc-800" />
                        </div>
                      )}
                      
                      {event.featured && (
                        <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Featured
                        </div>
                      )}
                      
                      <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur border border-border text-foreground text-sm font-bold px-3 py-1 rounded shadow-lg">
                        {event.startDate ? format(new Date(event.startDate), 'MMM d, yyyy') : 'TBA'}
                      </div>
                    </div>
                    
                    {/* Content Area */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>
                      
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 shrink-0 text-primary/70" />
                          <span className="truncate">{event.venueName || event.city || "Location TBA"} {event.province && `, ${event.province}`}</span>
                        </div>
                        {event.organizer && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 shrink-0 text-primary/70" />
                            <span className="truncate">{event.organizer}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-border/50 flex flex-wrap gap-2">
                        {event.categories?.slice(0, 2).map(cat => (
                          <span key={cat} className="text-xs bg-secondary border border-border px-2 py-1 rounded-full text-secondary-foreground font-medium">
                            {cat}
                          </span>
                        ))}
                        {event.categories && event.categories.length > 2 && (
                          <span className="text-xs bg-secondary border border-border px-2 py-1 rounded-full text-muted-foreground font-medium">
                            +{event.categories.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="h-[600px] rounded-xl overflow-hidden border border-border shadow-lg relative z-0">
              <MapContainer 
                center={[56.1304, -106.3468]} // Center of Canada roughly
                zoom={4} 
                style={{ height: '100%', width: '100%' }}
                className="bg-zinc-900"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {events.filter(e => e.latitude && e.longitude).map(event => (
                  <Marker 
                    key={event.id} 
                    position={[event.latitude!, event.longitude!]}
                    icon={redIcon}
                  >
                    <Popup className="custom-popup">
                      <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                        <h4 className="font-bold text-base leading-tight">{event.title}</h4>
                        <p className="text-sm text-gray-500 m-0">
                          {event.startDate ? format(new Date(event.startDate), 'MMM d, yyyy') : 'TBA'}
                        </p>
                        <p className="text-sm m-0">{event.city}{event.province ? `, ${event.province}` : ''}</p>
                        <Link href={`/events/${event.id}`} className="mt-2 text-primary font-medium hover:underline text-sm inline-block">
                          View Details &rarr;
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
