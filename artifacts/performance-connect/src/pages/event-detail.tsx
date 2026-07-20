import React from "react";
import { useRoute, Link } from "wouter";
import { useGetEvent } from "@workspace/api-client-react";
import { 
  ArrowLeft, MapPin, Calendar, Clock, DollarSign, 
  Users, ExternalLink, Flame, Activity, ShieldCheck,
  Navigation, Mail, Flag
} from "lucide-react";
import { format } from "date-fns";
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41]
});

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const { data: event, isLoading, error } = useGetEvent(id, {
    query: {
      enabled: !!id,
      queryKey: ["/api/events", id]
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-32 bg-secondary rounded mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[400px] bg-secondary rounded-xl"></div>
            <div className="h-12 bg-secondary rounded w-3/4"></div>
            <div className="h-24 bg-secondary rounded"></div>
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-secondary rounded-xl"></div>
            <div className="h-48 bg-secondary rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShieldCheck className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-4">Event Not Found</h2>
        <p className="text-muted-foreground mb-8">The event you're looking for doesn't exist or has been removed.</p>
        <Link href="/" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium inline-block">
          Return to Events
        </Link>
      </div>
    );
  }

  const hasCoordinates = event.latitude && event.longitude;

  return (
    <div className="flex-1 bg-background pb-16">
      {/* Top Bar */}
      <div className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to events
          </Link>
          <div className="flex gap-2">
            <button className="p-2 text-muted-foreground hover:text-foreground rounded transition-colors" title="Report Issue">
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Flyer Image */}
            {event.flyerUrl && (
              <div className="bg-zinc-950 rounded-xl border border-border/50 overflow-hidden shadow-2xl">
                <img 
                  src={event.flyerUrl} 
                  alt={`${event.title} Flyer`} 
                  className="w-full max-h-[700px] object-contain"
                />
              </div>
            )}

            {/* Header Info */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {event.featured && (
                  <span className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Featured
                  </span>
                )}
                {event.categories?.map(cat => (
                  <span key={cat} className="bg-secondary text-foreground text-xs font-semibold px-2 py-1 rounded border border-border uppercase tracking-wide">
                    {cat}
                  </span>
                ))}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-foreground leading-tight">
                {event.title}
              </h1>

              {event.description && (
                <div className="prose prose-invert max-w-none text-muted-foreground mt-2">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>

            {/* Features/Amenities */}
            {(event.hasBurnoutContest || event.hasDyno || event.isCharityEvent || event.hasFoodVendors) && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 uppercase tracking-wider text-muted-foreground">Event Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {event.hasBurnoutContest && (
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-lg border border-border/50 text-center gap-2">
                      <Flame className="w-8 h-8 text-primary" />
                      <span className="text-sm font-semibold">Burnout Contest</span>
                    </div>
                  )}
                  {event.hasDyno && (
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-lg border border-border/50 text-center gap-2">
                      <Activity className="w-8 h-8 text-blue-500" />
                      <span className="text-sm font-semibold">Dyno Available</span>
                    </div>
                  )}
                  {event.isCharityEvent && (
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-lg border border-border/50 text-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-green-500" />
                      <span className="text-sm font-semibold">Charity Event</span>
                    </div>
                  )}
                  {event.hasFoodVendors && (
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-lg border border-border/50 text-center gap-2">
                      <Users className="w-8 h-8 text-yellow-500" />
                      <span className="text-sm font-semibold">Food Vendors</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:sticky lg:top-24 flex flex-col gap-6">
            
            {/* Core Details Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
              <div className="p-6 flex flex-col gap-6">
                
                {/* Date & Time */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {event.startDate ? format(new Date(event.startDate), 'EEEE, MMMM d, yyyy') : 'Date TBA'}
                    </h3>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {event.startTime || 'Time TBA'}
                        {event.endTime && ` - ${event.endTime}`}
                      </span>
                    </div>
                    {event.rainDate && (
                      <div className="text-xs text-primary mt-2 font-medium bg-primary/10 inline-block px-2 py-1 rounded border border-primary/20">
                        Rain Date: {format(new Date(event.rainDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border/50 w-full" />

                {/* Location */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <MapPin className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{event.venueName || 'Location'}</h3>
                    <p className="text-muted-foreground mt-1">
                      {event.address}<br />
                      {event.city}{event.province ? `, ${event.province}` : ''}
                    </p>
                    {hasCoordinates && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm font-medium hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" /> Get Directions
                      </a>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border/50 w-full" />

                {/* Cost */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <DollarSign className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Entry Fee</h3>
                    <p className="text-muted-foreground mt-1">
                      {event.entryFee || 'Free / Not Specified'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Map */}
              {hasCoordinates && (
                <div className="h-48 bg-zinc-900 border-t border-border relative z-0">
                  <MapContainer 
                    center={[event.latitude!, event.longitude!]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    dragging={false}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    <Marker position={[event.latitude!, event.longitude!]} icon={redIcon} />
                  </MapContainer>
                </div>
              )}
            </div>

            {/* Organizer Card */}
            {(event.organizer || event.contactInfo || event.sourceUrl) && (
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 shadow-lg">
                <h3 className="font-bold text-lg uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Organizer & Contact</h3>
                
                {event.organizer && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Hosted By</div>
                    <div className="font-bold text-foreground">{event.organizer}</div>
                  </div>
                )}
                
                {event.contactInfo && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Contact</div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {event.contactInfo}
                    </div>
                  </div>
                )}

                {event.sourceUrl && (
                  <a 
                    href={event.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full mt-2 bg-secondary text-foreground hover:bg-secondary/80 border border-border py-2 px-4 rounded font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Original Event Link
                  </a>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
