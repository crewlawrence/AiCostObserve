import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";

interface BillingStatus {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
}

export default function Settings() {
  const workspaceId = localStorage.getItem("currentWorkspaceId");
  const { toast } = useToast();

  const { data: billingStatus, isLoading: billingLoading, isError: billingError } = useQuery<BillingStatus>({
    queryKey: workspaceId 
      ? ["/api/billing/status", { workspaceId }]
      : ["/api/billing/status"],
    enabled: !!workspaceId,
  });

  const upgradeWorkspace = useMutation({
    mutationFn: async () => {
      if (!workspaceId) {
        throw new Error("No workspace selected");
      }
      const res = await apiRequest(
        "POST",
        "/api/billing/create-checkout",
        { workspaceId }
      );
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/billing/status"] 
      });
    },
  });

  const manageSubscription = useMutation({
    mutationFn: async () => {
      if (!workspaceId) {
        throw new Error("No workspace selected");
      }
      const res = await apiRequest(
        "POST",
        "/api/billing/customer-portal",
        { workspaceId }
      );
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/billing/status"] 
      });
    },
  });

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">
            Please select or create a workspace to view settings.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20" data-testid="badge-subscription-active">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" data-testid="badge-subscription-trial">Free Trial</Badge>;
      case "past_due":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" data-testid="badge-subscription-past-due">Past Due</Badge>;
      case "canceled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20" data-testid="badge-subscription-canceled">Canceled</Badge>;
      default:
        return <Badge variant="secondary" data-testid="badge-subscription-unknown">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace and application preferences.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing information.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading billing information...
              </div>
            ) : billingError ? (
              <p className="text-sm text-destructive">
                Unable to load billing information. Please refresh the page or contact support if the issue persists.
              </p>
            ) : billingStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-muted-foreground">Subscription Status</Label>
                    <div className="mt-1">{getStatusBadge(billingStatus.subscriptionStatus)}</div>
                  </div>
                </div>

                {billingStatus.subscriptionStatus === "trialing" && billingStatus.trialEndsAt && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Trial Ends</Label>
                    <p className="text-sm mt-1">
                      {format(new Date(billingStatus.trialEndsAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                {billingStatus.subscriptionStatus === "trialing" && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-4">
                      Upgrade to continue using the platform after your trial ends. 
                      Only <strong>$49/month</strong> for unlimited AI observability.
                    </p>
                    <Button 
                      onClick={() => upgradeWorkspace.mutate()}
                      disabled={upgradeWorkspace.isPending}
                      data-testid="button-upgrade-subscription"
                    >
                      {upgradeWorkspace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upgrade to Pro - $49/month
                    </Button>
                  </div>
                )}

                {billingStatus.stripeCustomerId && billingStatus.subscriptionStatus !== "trialing" && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage your billing information, update payment methods, or view invoices.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => manageSubscription.mutate()}
                      disabled={manageSubscription.isPending}
                      data-testid="button-manage-billing"
                    >
                      {manageSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Manage Billing
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to load billing information.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks and feels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Information</CardTitle>
            <CardDescription>
              Details about your current workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Workspace ID</Label>
              <p className="font-mono text-sm mt-1">{workspaceId}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Information about the AI Observability SDK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documentation</span>
              <a href="#" className="text-primary hover:underline">
                View Docs
              </a>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Support</span>
              <a href="#" className="text-primary hover:underline">
                Get Help
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
