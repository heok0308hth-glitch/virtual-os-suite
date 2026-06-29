import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OSProvider } from "./contexts/OSContext";
import { Desktop } from "./pages/Desktop";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.1 0.02 280)" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">✦</div>
          <p style={{ color: "var(--color-muted-foreground)" }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <Route path={"/"} component={Desktop} />
      ) : (
        <Route path={"/"} component={LoginPage} />
      )}
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
