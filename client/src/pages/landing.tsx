import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, BarChart3, Clock, DollarSign } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Failed to create account",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, firstName, lastName });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" data-testid="logo-icon" />
            <span className="font-semibold text-lg" data-testid="text-app-name">
              AI Observability
            </span>
          </div>
          <Button
            onClick={() => {
              setIsLogin(true);
              setShowAuth(true);
            }}
            data-testid="button-signin"
          >
            Sign In
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1
              className="text-5xl font-bold tracking-tight"
              data-testid="text-hero-title"
            >
              Monitor Your AI Applications
            </h1>
            <p
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              data-testid="text-hero-subtitle"
            >
              Track costs, performance, and usage across all your AI models in
              real-time. Get insights into every API call, token usage, and
              latency metric.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <div className="space-y-2" data-testid="feature-realtime">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Real-time Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Stream telemetry data as it happens with WebSocket connections
              </p>
            </div>

            <div className="space-y-2" data-testid="feature-cost">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Cost Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor spending per model, project, and environment
              </p>
            </div>

            <div className="space-y-2" data-testid="feature-analytics">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Detailed breakdowns of model usage and performance metrics
              </p>
            </div>

            <div className="space-y-2" data-testid="feature-latency">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Latency Insights</h3>
              <p className="text-sm text-muted-foreground">
                Track response times and identify performance bottlenecks
              </p>
            </div>
          </div>

          <div className="pt-8">
            <Button
              size="lg"
              onClick={() => {
                setIsLogin(false);
                setShowAuth(true);
              }}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AI Observability. All rights reserved.
        </div>
      </footer>

      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent data-testid="dialog-auth">
          <DialogHeader>
            <DialogTitle data-testid="text-auth-title">
              {isLogin ? "Sign In" : "Create Account"}
            </DialogTitle>
            <DialogDescription>
              {isLogin
                ? "Enter your credentials to access your account"
                : "Create a new account to get started"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-testid="input-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-lastname"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || registerMutation.isPending}
              data-testid="button-submit"
            >
              {loginMutation.isPending || registerMutation.isPending
                ? "Loading..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </Button>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
                data-testid="button-toggle-auth"
              >
                {isLogin
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
