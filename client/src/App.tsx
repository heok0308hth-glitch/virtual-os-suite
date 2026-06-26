import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OSProvider } from "./contexts/OSContext";
import { Desktop } from "./pages/Desktop";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Desktop} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <OSProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </OSProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
