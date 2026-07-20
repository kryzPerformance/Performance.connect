import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Layout } from "./components/layout";
import Home from "./pages/home";
import EventDetail from "./pages/event-detail";
import SubmitEvent from "./pages/submit";
import Dashboard from "./pages/admin/dashboard";
import Sources from "./pages/admin/sources";
import Stats from "./pages/admin/stats";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/submit" component={SubmitEvent} />
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/sources" component={Sources} />
        <Route path="/admin/stats" component={Stats} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
