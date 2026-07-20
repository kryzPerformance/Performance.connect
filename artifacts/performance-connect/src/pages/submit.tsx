import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateEvent, useParseFlyer, EventInputSource } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  organizer: z.string().optional(),
  venueName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  rainDate: z.string().optional(),
  entryFee: z.string().optional(),
  contactInfo: z.string().optional(),
  sourceUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isCharityEvent: z.boolean().default(false),
  hasFoodVendors: z.boolean().default(false),
  hasBurnoutContest: z.boolean().default(false),
  hasDyno: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  flyerUrl: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmitEvent() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = React.useState<"flyer" | "manual">("flyer");
  
  // Drag & Drop state
  const [isDragging, setIsDragging] = React.useState(false);
  const [flyerImage, setFlyerImage] = React.useState<string | null>(null);
  
  const parseFlyerMutation = useParseFlyer();
  const createEventMutation = useCreateEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      categories: [],
      isCharityEvent: false,
      hasFoodVendors: false,
      hasBurnoutContest: false,
      hasDyno: false
    }
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setFlyerImage(base64);
      
      try {
        const result = await parseFlyerMutation.mutateAsync({
          data: { imageData: base64, isUrl: false }
        });
        
        // Populate form fields with extracted data
        const fields = result.extractedFields;
        if (fields.title) form.setValue("title", fields.title);
        if (fields.organizer) form.setValue("organizer", fields.organizer);
        if (fields.venueName) form.setValue("venueName", fields.venueName);
        if (fields.address) form.setValue("address", fields.address);
        if (fields.city) form.setValue("city", fields.city);
        if (fields.province) form.setValue("province", fields.province);
        if (fields.startDate) form.setValue("startDate", fields.startDate);
        if (fields.startTime) form.setValue("startTime", fields.startTime);
        if (fields.endDate) form.setValue("endDate", fields.endDate);
        if (fields.endTime) form.setValue("endTime", fields.endTime);
        if (fields.rainDate) form.setValue("rainDate", fields.rainDate);
        if (fields.entryFee) form.setValue("entryFee", fields.entryFee);
        if (fields.contactInfo) form.setValue("contactInfo", fields.contactInfo);
        
        if (fields.isCharityEvent) form.setValue("isCharityEvent", fields.isCharityEvent);
        if (fields.hasFoodVendors) form.setValue("hasFoodVendors", fields.hasFoodVendors);
        if (fields.hasBurnoutContest) form.setValue("hasBurnoutContest", fields.hasBurnoutContest);
        if (fields.hasDyno) form.setValue("hasDyno", fields.hasDyno);
        
        if (fields.categories && fields.categories.length > 0) {
          form.setValue("categories", fields.categories);
        }

        toast({
          title: "Flyer Parsed",
          description: `Extracted data with ${Math.round(result.confidenceScore * 100)}% confidence. Please review before submitting.`,
        });
        
        setActiveTab("manual"); // Switch to manual tab to review
      } catch (err) {
        toast({
          title: "Parsing Failed",
          description: "Could not extract data from the flyer. Please enter details manually.",
          variant: "destructive"
        });
        setActiveTab("manual");
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await createEventMutation.mutateAsync({
        data: {
          ...data,
          source: EventInputSource.community,
          flyerUrl: flyerImage || undefined // Real app would upload this to object storage first
        }
      });
      
      toast({
        title: "Event Submitted!",
        description: "Your event has been submitted for moderation. Thank you!",
      });
      
      setLocation("/");
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: "An error occurred while submitting the event.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black uppercase italic tracking-tight mb-4">Submit an <span className="text-primary">Event</span></h1>
          <p className="text-muted-foreground text-lg">
            Help grow the community. Upload a flyer for AI extraction, or enter the details manually.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                activeTab === "flyer" 
                  ? "bg-primary/10 text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              onClick={() => setActiveTab("flyer")}
              data-testid="tab-flyer"
            >
              <Upload className="w-4 h-4" />
              Upload Flyer
            </button>
            <button
              className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                activeTab === "manual" 
                  ? "bg-primary/10 text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              onClick={() => setActiveTab("manual")}
              data-testid="tab-manual"
            >
              <FileText className="w-4 h-4" />
              Review / Manual Entry
            </button>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === "flyer" && (
              <div className="flex flex-col gap-6">
                <div 
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                    isDragging 
                      ? "border-primary bg-primary/5 ring-4 ring-primary/20" 
                      : "border-border hover:border-primary/50 hover:bg-secondary/30"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {parseFlyerMutation.isPending ? (
                    <div className="flex flex-col items-center gap-4 text-primary">
                      <Loader2 className="w-12 h-12 animate-spin" />
                      <p className="font-medium text-lg animate-pulse">Our AI is analyzing the flyer...</p>
                    </div>
                  ) : flyerImage ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-32 h-32 rounded bg-background border border-border overflow-hidden relative">
                        <img src={flyerImage} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <p className="font-medium text-green-500">Flyer processed successfully!</p>
                      <button 
                        onClick={() => setActiveTab("manual")}
                        className="mt-2 bg-primary text-primary-foreground px-6 py-2 rounded font-medium flex items-center gap-2"
                      >
                        Review Extracted Data <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Drag & Drop Flyer Image</h3>
                      <p className="text-muted-foreground max-w-sm mb-8">
                        Upload an event poster or flyer. Our AI will automatically extract the title, date, location, and other details.
                      </p>
                      
                      <div className="relative">
                        <input 
                          type="file" 
                          id="file-upload" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleFileChange}
                          data-testid="input-flyer-file"
                        />
                        <button className="bg-secondary text-foreground border border-border px-6 py-2 rounded font-medium pointer-events-none">
                          Browse Files
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">JPG, PNG, or WEBP up to 5MB</p>
                    </>
                  )}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100">
                    <strong>AI Extraction Note:</strong> The automated system works best on clear, high-contrast flyers. You will have a chance to review and edit all extracted information before final submission.
                  </div>
                </div>
              </div>
            )}

            {activeTab === "manual" && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
                
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border/50 pb-2 uppercase tracking-wide text-primary">Basic Information</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Event Title <span className="text-destructive">*</span></label>
                    <input 
                      {...form.register("title")}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. Summer Showdown 2025"
                      data-testid="input-title"
                    />
                    {form.formState.errors.title && <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <textarea 
                      {...form.register("description")}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px]"
                      placeholder="Details about the event..."
                      data-testid="input-description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Organizer / Host</label>
                      <input 
                        {...form.register("organizer")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-organizer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Original Event URL</label>
                      <input 
                        {...form.register("sourceUrl")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="https://..."
                        data-testid="input-source-url"
                      />
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border/50 pb-2 uppercase tracking-wide text-primary">Date & Time</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Start Date</label>
                      <input 
                        type="date"
                        {...form.register("startDate")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">End Date (optional)</label>
                      <input 
                        type="date"
                        {...form.register("endDate")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-end-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Start Time</label>
                      <input 
                        type="time"
                        {...form.register("startTime")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-start-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">End Time</label>
                      <input 
                        type="time"
                        {...form.register("endTime")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-end-time"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border/50 pb-2 uppercase tracking-wide text-primary">Location</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Venue Name</label>
                    <input 
                      {...form.register("venueName")}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. Toronto Motorsports Park"
                      data-testid="input-venue-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Address</label>
                    <input 
                      {...form.register("address")}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">City</label>
                      <input 
                        {...form.register("city")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Province</label>
                      <select 
                        {...form.register("province")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-province"
                      >
                        <option value="">Select...</option>
                        <option value="ON">Ontario (ON)</option>
                        <option value="QC">Quebec (QC)</option>
                        <option value="BC">British Columbia (BC)</option>
                        <option value="AB">Alberta (AB)</option>
                        <option value="MB">Manitoba (MB)</option>
                        <option value="SK">Saskatchewan (SK)</option>
                        <option value="NS">Nova Scotia (NS)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Details & Features */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border/50 pb-2 uppercase tracking-wide text-primary">Details & Features</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Entry Fee</label>
                      <input 
                        {...form.register("entryFee")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. $20 Spectators, $50 Racers"
                        data-testid="input-entry-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Contact Email/Phone</label>
                      <input 
                        {...form.register("contactInfo")}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-contact"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-secondary/30 p-4 rounded-lg border border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...form.register("hasBurnoutContest")} className="rounded text-primary focus:ring-primary bg-background border-input" data-testid="checkbox-burnout" />
                      <span className="text-sm font-medium">Burnout Contest</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...form.register("hasDyno")} className="rounded text-primary focus:ring-primary bg-background border-input" data-testid="checkbox-dyno" />
                      <span className="text-sm font-medium">Dyno On-site</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...form.register("hasFoodVendors")} className="rounded text-primary focus:ring-primary bg-background border-input" data-testid="checkbox-food" />
                      <span className="text-sm font-medium">Food Vendors</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...form.register("isCharityEvent")} className="rounded text-primary focus:ring-primary bg-background border-input" data-testid="checkbox-charity" />
                      <span className="text-sm font-medium">Charity Event</span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t border-border">
                  <Link href="/" className="px-6 py-2 rounded font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    Cancel
                  </Link>
                  <button 
                    type="submit" 
                    disabled={createEventMutation.isPending}
                    className="bg-primary text-primary-foreground px-8 py-2 rounded font-bold uppercase tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    data-testid="btn-submit-event"
                  >
                    {createEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Submit Event
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}