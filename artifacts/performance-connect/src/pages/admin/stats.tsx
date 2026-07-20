import React from "react";
import { useGetEventStats } from "@workspace/api-client-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Activity, CalendarDays, TrendingUp, CheckCircle, Clock, XCircle, Copy } from "lucide-react";

export default function Stats() {
  const { data: stats, isLoading } = useGetEventStats();

  const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex-1 bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">High-level view of database health and coverage.</p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Total Events</span>
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-foreground">{stats.totalEvents}</span>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Approved</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-2xl font-black text-green-500">{stats.approvedCount}</span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Pending</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <span className="text-2xl font-black text-yellow-500">{stats.pendingCount}</span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Rejected</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-2xl font-black text-red-500">{stats.rejectedCount}</span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Duplicates</span>
              <Copy className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-2xl font-black text-orange-500">{stats.duplicateCount}</span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Featured</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-2xl font-black text-blue-500">{stats.featuredCount}</span>
          </div>
        </div>

        {/* Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-primary mb-1">Growth Velocity</h3>
              <p className="text-muted-foreground text-sm">Events added in the last 7 days</p>
            </div>
            <div className="text-4xl font-black text-primary">+{stats.recentlyAdded}</div>
          </div>
          
          <div className="bg-secondary/50 border border-border rounded-xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-foreground mb-1">Upcoming Action</h3>
              <p className="text-muted-foreground text-sm">Events scheduled for this month</p>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-muted-foreground opacity-50" />
              <div className="text-4xl font-black text-foreground">{stats.upcomingThisMonth}</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Province Chart */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 uppercase tracking-wider text-muted-foreground">Coverage by Province</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.eventsByProvince} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="province" stroke="#666" tick={{fill: '#999', fontSize: 12}} />
                  <YAxis stroke="#666" tick={{fill: '#999', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#222'}} 
                    contentStyle={{backgroundColor: '#111', borderColor: '#333', color: '#fff'}}
                  />
                  <Bar dataKey="count" fill="hsl(0, 84%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Chart */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 uppercase tracking-wider text-muted-foreground">Events by Category</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.eventsByCategory} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#666" tick={{fill: '#999', fontSize: 12}} />
                  <YAxis dataKey="category" type="category" stroke="#666" tick={{fill: '#eee', fontSize: 12}} width={100} />
                  <Tooltip 
                    cursor={{fill: '#222'}} 
                    contentStyle={{backgroundColor: '#111', borderColor: '#333', color: '#fff'}}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.eventsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}