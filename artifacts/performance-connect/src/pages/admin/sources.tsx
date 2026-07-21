import React from "react";
import { 
  useListSources, 
  useCreateSource, 
  useUpdateSource, 
  useDeleteSource,
  useCheckSource,
  getListSourcesQueryKey,
  EventSourceInputType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Database, Plus, Trash2, Edit2, PlayCircle, 
  CheckCircle2, XCircle, Loader2, Globe, Instagram, Facebook, Box, RadarIcon
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(EventSourceInputType),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  active: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

export default function Sources() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = React.useState(false);

  const { data: sources, isLoading } = useListSources();
  const createMutation = useCreateSource();
  const updateMutation = useUpdateSource();
  const deleteMutation = useDeleteSource();
  const checkMutation = useCheckSource();
  const [checkingId, setCheckingId] = React.useState<number | null>(null);

  const handleCheck = async (id: number) => {
    setCheckingId(id);
    try {
      const result = await checkMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey() });
      toast({
        title: result.ok ? "Scan Complete" : "Scan Skipped",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Error", description: "The scan failed. Please try again.", variant: "destructive" });
    } finally {
      setCheckingId(null);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "website",
      url: "",
      active: true
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey() });
      setShowAddForm(false);
      form.reset();
      toast({ title: "Source Added", description: "The discovery source has been added successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add source.", variant: "destructive" });
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ 
        id, 
        data: { active: !currentActive } 
      });
      queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey() });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey() });
      toast({ title: "Source Deleted" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete source.", variant: "destructive" });
    }
  };

  const getSourceIcon = (type: string) => {
    switch(type) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'api': return <Database className="w-4 h-4" />;
      case 'website': return <Globe className="w-4 h-4" />;
      default: return <Box className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tight">Discovery Sources</h1>
            <p className="text-muted-foreground mt-1">Manage automated scrapers and API integrations.</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded font-bold uppercase tracking-wider text-sm flex items-center gap-2 transition-all"
            data-testid="btn-add-source"
          >
            {showAddForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Cancel" : "Add Source"}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-card border border-primary/50 rounded-xl p-6 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
            <h2 className="font-bold text-lg mb-4 text-primary uppercase tracking-wide border-b border-primary/20 pb-2">New Source Configuration</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Source Name</label>
                  <input 
                    {...form.register("name")}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Ontario Track Days API"
                  />
                  {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Type</label>
                  <select 
                    {...form.register("type")}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="website">Website Scraper</option>
                    <option value="instagram">Instagram Account</option>
                    <option value="facebook">Facebook Group/Page</option>
                    <option value="api">JSON API</option>
                    <option value="manual">Manual Tracking</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Target URL / Endpoint</label>
                <input 
                  {...form.register("url")}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="https://..."
                />
                {form.formState.errors.url && <p className="text-destructive text-xs">{form.formState.errors.url.message}</p>}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  {...form.register("active")}
                  className="rounded text-primary focus:ring-primary bg-background border-input w-4 h-4" 
                  id="active-toggle"
                />
                <label htmlFor="active-toggle" className="text-sm font-medium cursor-pointer">Start polling immediately</label>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/50">
                <button 
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Source"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sources Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground uppercase font-bold text-xs tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Source Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Last Checked</th>
                  <th className="px-6 py-4 text-right">Events Found</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : sources?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No discovery sources configured.
                    </td>
                  </tr>
                ) : sources?.map((source) => (
                  <tr key={source.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleActive(source.id, source.active)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border transition-colors ${
                          source.active 
                            ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" 
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20"
                        }`}
                        title="Toggle Status"
                      >
                        {source.active ? <PlayCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {source.active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {source.name}
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="block text-xs font-normal text-muted-foreground hover:text-primary truncate max-w-xs mt-0.5">
                          {source.url}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary text-secondary-foreground border border-border text-xs font-medium uppercase">
                        {getSourceIcon(source.type)}
                        {source.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {source.lastCheckedAt ? format(new Date(source.lastCheckedAt), 'MMM d, h:mm a') : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                      {source.eventsFound || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {source.url && source.type !== "instagram" && source.type !== "facebook" && source.type !== "manual" && (
                          <button
                            onClick={() => handleCheck(source.id)}
                            disabled={checkingId !== null}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
                            title="Scan this source for events now"
                            data-testid={`btn-check-source-${source.id}`}
                          >
                            {checkingId === source.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RadarIcon className="w-3.5 h-3.5" />}
                            {checkingId === source.id ? "Scanning..." : "Scan Now"}
                          </button>
                        )}
                        <button className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(source.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors" 
                          title="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}