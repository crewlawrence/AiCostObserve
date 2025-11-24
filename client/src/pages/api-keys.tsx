import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Key, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ApiKey, InsertApiKey } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "API key name is required").max(100),
});

export default function ApiKeys() {
  const workspaceId = localStorage.getItem("currentWorkspaceId");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys", { workspaceId }],
    enabled: !!workspaceId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const createApiKey = useMutation({
    mutationFn: async (data: InsertApiKey) => {
      return await apiRequest<ApiKey>("POST", "/api/api-keys", data);
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      
      // Store the API key in localStorage for WebSocket authentication
      if (workspaceId) {
        localStorage.setItem(`apiKey_${workspaceId}`, newKey.key);
      }
      
      toast({
        title: "API key created",
        description: "Your API key has been created successfully. Make sure to copy it now!",
      });
      setRevealedKeys(new Set([newKey.id]));
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      return await apiRequest("DELETE", `/api/api-keys/${keyId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API key deleted",
        description: "The API key has been deleted successfully.",
      });
      setKeyToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!workspaceId) return;
    await createApiKey.mutateAsync({
      workspaceId,
      name: values.name,
      key: `ak_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskApiKey = (key: string) => {
    return `${key.substring(0, 10)}${"•".repeat(20)}`;
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">
            Please select or create a workspace to manage API keys.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for SDK authentication.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-api-key">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Create a new API key for SDK integration.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Production API Key"
                          data-testid="input-api-key-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this key
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createApiKey.isPending}
                    data-testid="button-submit-api-key"
                  >
                    {createApiKey.isPending ? "Creating..." : "Create API key"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading API keys...</div>
      ) : apiKeys && apiKeys.length > 0 ? (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} data-testid={`api-key-card-${apiKey.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                      {revealedKeys.has(apiKey.id) && (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      Created {new Date(apiKey.createdAt).toLocaleDateString()}
                      {apiKey.lastUsedAt && (
                        <> • Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}</>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setKeyToDelete(apiKey)}
                    data-testid={`button-delete-${apiKey.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-md p-3 font-mono text-sm overflow-x-auto">
                    {revealedKeys.has(apiKey.id) ? apiKey.key : maskApiKey(apiKey.key)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleReveal(apiKey.id)}
                    data-testid={`button-reveal-${apiKey.id}`}
                  >
                    {revealedKeys.has(apiKey.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiKey.key)}
                    data-testid={`button-copy-${apiKey.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first API key to start integrating the SDK.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-api-key">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!keyToDelete}
        onOpenChange={(open) => !open && setKeyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{keyToDelete?.name}</strong>. Any applications
              using this key will no longer be able to send telemetry data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToDelete && deleteApiKey.mutate(keyToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
