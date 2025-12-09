import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface BillingStatus {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
}

export function TrialBanner() {
  const workspaceId = localStorage.getItem("currentWorkspaceId");
  
  const { data: billingStatus, isError, isLoading } = useQuery<BillingStatus>({
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
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/billing/status"] 
      });
    },
  });

  if (isLoading) {
    return null;
  }

  if (isError || !billingStatus) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/5" data-testid="alert-billing-error">
        <AlertCircle className="h-4 w-4 text-orange-500" />
        <AlertDescription>
          Unable to load subscription status. Please refresh the page or contact support if the issue persists.
        </AlertDescription>
      </Alert>
    );
  }

  if (billingStatus.subscriptionStatus === "active") || billingstatus.stripeSubscriptionId) {
    return null;
  }

  const isTrialing = billingStatus.subscriptionStatus === "trialing";
  const isPastDue = billingStatus.subscriptionStatus === "past_due";
  const isCanceled = billingStatus.subscriptionStatus === "canceled";
  
  let daysRemaining = 0;
  let trialEndDate = "";
  let trialExpired = false;
  
  if (isTrialing && billingStatus.trialEndsAt) {
    const trialEnd = new Date(billingStatus.trialEndsAt);
    daysRemaining = Math.max(0, differenceInDays(trialEnd, new Date()));
    trialEndDate = format(trialEnd, "MMMM d, yyyy");
    trialExpired = daysRemaining === 0;
  }

  const handleUpgrade = () => {
    upgradeWorkspace.mutate();
  };

  if (trialExpired) {
    return (
      <Alert className="border-destructive/50 bg-destructive/5" data-testid="alert-trial-expired">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Your free trial has ended</strong>. 
            Upgrade now to continue using the platform.
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleUpgrade}
            disabled={upgradeWorkspace.isPending}
            data-testid="button-upgrade-expired"
          >
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isTrialing && daysRemaining > 3) {
    return (
      <Alert className="border-primary/50 bg-primary/5" data-testid="alert-trial-active">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            You're on a free trial with <strong>{daysRemaining} days remaining</strong> (ends {trialEndDate}). 
            Upgrade anytime to continue after your trial.
          </span>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleUpgrade}
            disabled={upgradeWorkspace.isPending}
            data-testid="button-upgrade-trial"
          >
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isTrialing && daysRemaining <= 3) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/5" data-testid="alert-trial-expiring">
        <AlertCircle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Your trial expires in {daysRemaining} days</strong> on {trialEndDate}. 
            Upgrade now to avoid service interruption.
          </span>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleUpgrade}
            disabled={upgradeWorkspace.isPending}
            data-testid="button-upgrade-urgent"
          >
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isPastDue || isCanceled) {
    return (
      <Alert className="border-destructive/50 bg-destructive/5" data-testid="alert-subscription-inactive">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Your subscription is {isPastDue ? "past due" : "inactive"}</strong>. 
            Please update your billing information to restore access.
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleUpgrade}
            disabled={upgradeWorkspace.isPending}
            data-testid="button-reactivate"
          >
            {isPastDue ? "Update Billing" : "Reactivate"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
