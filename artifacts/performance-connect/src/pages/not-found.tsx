import React from "react";
import { ShieldAlert } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] bg-background text-center px-4">
      <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 mb-6">
        <ShieldAlert className="w-12 h-12 text-destructive" />
      </div>
      <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight mb-4">
        404 <span className="text-primary">Not Found</span>
      </h1>
      <p className="text-muted-foreground text-lg max-w-md mb-8">
        Looks like you took a wrong turn at the track. This page doesn't exist.
      </p>
      <Link 
        href="/" 
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-md font-bold uppercase tracking-wider transition-all"
      >
        Return to Pits
      </Link>
    </div>
  );
}