import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import type { Workspace } from "@shared/schema";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    localStorage.getItem("currentWorkspaceId")
  );

  const { data: workspaces, isLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  // Auto-select first workspace if none is selected
  useEffect(() => {
    if (!isLoading && workspaces && workspaces.length > 0 && !currentWorkspaceId) {
      const firstWorkspace = workspaces[0];
      setCurrentWorkspaceId(firstWorkspace.id);
      localStorage.setItem("currentWorkspaceId", firstWorkspace.id);
    }
  }, [workspaces, isLoading, currentWorkspaceId]);

  const currentWorkspace = workspaces?.find((w) => w.id === currentWorkspaceId);

  const handleSelectWorkspace = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem("currentWorkspaceId", workspaceId);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid="button-workspace-switcher"
          >
            <span className="truncate">
              {isLoading ? "Loading..." : currentWorkspace?.name || "Select workspace"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0">
          <Command>
            <CommandInput placeholder="Search workspace..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup>
                {workspaces?.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => handleSelectWorkspace(workspace.id)}
                    data-testid={`workspace-item-${workspace.slug}`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        currentWorkspace?.id === workspace.id
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    {workspace.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewWorkspaceDialog(true);
                  }}
                  data-testid="button-create-workspace"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create workspace
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateWorkspaceDialog
        open={showNewWorkspaceDialog}
        onOpenChange={setShowNewWorkspaceDialog}
        onWorkspaceCreated={(workspace) => {
          setCurrentWorkspaceId(workspace.id);
          localStorage.setItem("currentWorkspaceId", workspace.id);
        }}
      />
    </>
  );
}
