"use client";

import { useEffect, useMemo, useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { H2 } from "@/components/ui/typography";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { api } from "@/lib/api";
import { OrganizationMember, Technician } from "../../../../types";
import { ProviderManagement } from "../../provider";
import { RoleChangeDialog } from "./RoleChangeDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamViewProps {
  technicians: Technician[];
  currentUserId?: string;
}

export function TeamView({
  technicians,
  currentUserId: userIdProp,
}: TeamViewProps) {
  const [technicianList, setTechnicianList] =
    useState<Technician[]>(technicians);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [magicLink, setMagicLink] = useState("https://app.vrem.io/invite/team");
  const { activeOrganizationId, activeMembership } = useCurrentOrganization();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [technicianToRemove, setTechnicianToRemove] =
    useState<Technician | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<
    Technician["role"] | undefined
  >(undefined);
  const [pendingTechnician, setPendingTechnician] = useState<Technician | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    userIdProp ?? null
  );
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(
    null
  );
  const currentUserRole = useMemo(
    () => technicianList.find((t) => t.id === currentUserId)?.role,
    [technicianList, currentUserId]
  );
  const [inviteRole, setInviteRole] =
    useState<Technician["role"]>("TECHNICIAN");
  const membershipRole = useMemo(
    () =>
      ((activeMembership?.role ||
        (activeMembership as any)?.orgRole ||
        "") as string).toUpperCase(),
    [activeMembership]
  );
  const effectiveCurrentRole = useMemo(
    () => ((currentUserRole || membershipRole || "") as string).toUpperCase(),
    [currentUserRole, membershipRole]
  );
  const isProjectManager = effectiveCurrentRole === "PROJECT_MANAGER";
  const canManageTeam = !isProjectManager;

  const linkOrigin = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://app.vrem.io";
  }, []);

  useEffect(() => {
    const token = Math.random().toString(36).slice(2, 8);
    const orgSegment = activeOrganizationId || "team";
    setMagicLink(`${linkOrigin}/invite/${orgSegment}?token=${token}`);
  }, [activeOrganizationId, linkOrigin]);

  useEffect(() => {
    setTechnicianList(technicians);
    try {
      const storedUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (storedUserId) setCurrentUserId(storedUserId);
      else if (userIdProp) setCurrentUserId(userIdProp);
      const storedMemberId =
        typeof window !== "undefined"
          ? localStorage.getItem("membershipId")
          : null;
      if (storedMemberId) setCurrentUserMemberId(storedMemberId);
    } catch (error) {
      // ignore
    }
  }, [technicians, userIdProp]);

  const addEmails = (emails: string[]) => {
    setInviteEmails((prev) => {
      const set = new Set(prev);
      emails.forEach((email) => {
        const trimmed = email.trim();
        if (trimmed) {
          set.add(trimmed);
        }
      });
      return Array.from(set);
    });
  };

  const handleEmailInputChange = (value: string) => {
    const segments = value.split(/[, ]+/);
    if (segments.length > 1) {
      const pending = segments.pop() || "";
      addEmails(segments);
      setEmailInput(pending);
    } else {
      setEmailInput(value);
    }
  };

  const handleEmailInputCommit = () => {
    if (emailInput.trim()) {
      addEmails([emailInput]);
      setEmailInput("");
    }
  };

  const handleEmailKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleEmailInputCommit();
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSendInvites = async () => {
    if (!canManageTeam) {
      toast.error("Project managers cannot invite teammates.");
      return;
    }
    const pending = emailInput.trim();
    const emails = [...inviteEmails, ...(pending ? [pending] : [])];

    if (emails.length === 0) {
      toast.error("Enter at least one email address.");
      return;
    }

    const invalidEmail = emails.find((email) => !email.includes("@"));
    if (invalidEmail) {
      toast.error(`Invalid email: ${invalidEmail}`);
      return;
    }

    if (!activeOrganizationId) {
      toast.error("Select an organization before inviting teammates.");
      return;
    }

    setIsInviting(true);

    try {
      await Promise.all(
        emails.map((email) =>
          api.organizations.createInvite(email, inviteRole || "TECHNICIAN")
        )
      );
      toast.success(
        emails.length > 1
          ? `Invitations sent to ${emails.join(", ")}`
          : `Invitation sent to ${emails[0]}`
      );
      setInviteEmails([]);
      setEmailInput("");
      setInviteOpen(false);
    } catch (error) {
      console.error("Failed to send invite", error);
      const message =
        error instanceof Error ? error.message : "Failed to send invite";
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyMagicLink = async () => {
    try {
      await navigator.clipboard.writeText(magicLink);
      toast.success("Magic link copied");
    } catch (error) {
      console.error("Failed to copy magic link", error);
      toast.error("Unable to copy magic link");
    }
  };

  const handleResetMagicLink = () => {
    const token = Math.random().toString(36).slice(2, 8);
    const orgSegment = activeOrganizationId || "team";
    const link = `${linkOrigin}/invite/${orgSegment}?token=${token}`;
    setMagicLink(link);
    toast.success("Magic link reset");
  };

  const renderTechnicianRow = (technician: Technician) => (
    <div
      key={technician.id}
      className="flex items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2"
    >
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={technician.avatar} alt={technician.name} />
        <AvatarFallback>{technician.name?.slice(0, 1) || "T"}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium truncate">
          {technician.name || "Technician"}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {technician.email || "No email provided"}
        </span>
      </div>
      <Badge variant="outline" className="shrink-0">
        {technician.role || "Technician"}
      </Badge>
    </div>
  );

  const openDialogAndFocusInput = (open: boolean) => {
    if (!canManageTeam) return;
    setInviteOpen(open);
    if (!open) {
      setInviteEmails([]);
      setEmailInput("");
    }
  };

  const handleRemoveTechnician = (technician: Technician) => {
    setTechnicianToRemove(technician);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveTechnician = () => {
    if (!technicianToRemove) return;
    setTechnicianList((prev) =>
      prev.filter((t) => t.id !== technicianToRemove.id)
    );
    toast.success("Technician removed from team");
    setRemoveDialogOpen(false);
    setTechnicianToRemove(null);
  };

  const handleRoleChange = async (
    technician: Technician,
    role: Technician["role"]
  ) => {
    if (!canManageTeam) {
      toast.error("Project managers cannot change roles.");
      return;
    }
    if (!technician.memberId) {
      toast.error("Unable to update role: missing member id");
      return;
    }
    // Admins cannot change owner roles; owners cannot demote themselves here
    if (technician.role === "OWNER") {
      toast.error("Owners can only be changed by the current owner");
      return;
    }

    if (role === "OWNER") {
      setPendingTechnician(technician);
      setPendingRole(role);
      setRoleDialogOpen(true);
      return;
    }
    setUpdatingRoleId(technician.id);
    try {
      const updated = await api.organizations.updateMemberRole(
        technician.memberId,
        role as OrganizationMember["role"]
      );
      const updatedRole =
        (updated as any)?.orgRole || updated.role || role;
      setTechnicianList((prev) =>
        prev.map((t) =>
          t.id === technician.id ? { ...t, role: updatedRole } : t
        )
      );
      toast.success("Role updated");
    } catch (error) {
      console.error("Failed to update role", error);
      toast.error("Unable to update role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const confirmOwnerChange = async () => {
    if (!canManageTeam) {
      toast.error("Project managers cannot change roles.");
      setRoleDialogOpen(false);
      return;
    }
    if (!pendingTechnician || !pendingRole || !pendingTechnician.memberId) {
      setRoleDialogOpen(false);
      return;
    }
    setUpdatingRoleId(pendingTechnician.id);
    try {
      const updated = await api.organizations.updateMemberRole(
        pendingTechnician.memberId,
        pendingRole
      );
      const updatedRole =
        (updated as any)?.orgRole || updated.role || pendingRole;
      setTechnicianList((prev) =>
        prev.map((t) =>
          t.id === pendingTechnician.id ? { ...t, role: updatedRole } : t
        )
      );
      toast.success("Role updated");
    } catch (error) {
      console.error("Failed to update role", error);
      toast.error("Unable to update role");
    } finally {
      setUpdatingRoleId(null);
      setRoleDialogOpen(false);
      setPendingRole(undefined);
      setPendingTechnician(null);
    }
  };

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-4xl mb-xs">Team</H2>
            {canManageTeam && (
              <Dialog open={inviteOpen} onOpenChange={openDialogAndFocusInput}>
                <DialogTrigger asChild>
                  <Button variant="default" className="px-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Teammate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl w-full flex flex-col">
                  <DialogHeader className="space-y-1.5">
                    <DialogTitle className="text-xl">
                      Invite people to your team
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Send email invites or share a magic link to bring teammates
                      on board.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 w-full">
                    <div className="space-y-3">
                      <div className="text-sm font-semibold">
                        Invite teammates
                      </div>
                      <div className="flex gap-2 flex-col">
                        <div className="flex flex-1 gap-2 overflow-x-scroll scrollbar-hide max-w-full">
                          {inviteEmails.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {email}
                              <Button
                                variant="mutedFlat"
                                className="p-0 w-auto ml-0.5 cursor-pointer"
                                onClick={() => handleRemoveEmail(email)}
                                aria-label={`Remove ${email}`}
                                size="icon-sm"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-1 flex-col gap-0 sm:flex-row">
                          <Input
                            placeholder="Enter emails (comma separated)"
                            value={emailInput}
                            onChange={(e) =>
                              handleEmailInputChange(e.target.value)
                            }
                            onKeyDown={handleEmailKeyDown}
                            className="flex-1"
                            autoFocus
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                          <Select
                            value={inviteRole}
                            onValueChange={(value) =>
                              setInviteRole(value as Technician["role"])
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TECHNICIAN">
                                Technician
                              </SelectItem>
                              <SelectItem value="PROJECT_MANAGER">
                                Project Manager
                              </SelectItem>
                              <SelectItem value="EDITOR">Editor</SelectItem>
                              <SelectItem value="DISPATCHER">
                                Dispatcher
                              </SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleSendInvites}
                            disabled={isInviting}
                            className="sm:w-auto w-full flex-1"
                          >
                            {isInviting ? "Sending..." : "Invite"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-auto">
                        {technicianList.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No team members yet. Invite someone to get started.
                          </div>
                        ) : (
                          technicianList.map(renderTechnicianRow)
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>Invite via magic link</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={handleResetMagicLink}
                        >
                          Reset
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input readOnly value={magicLink} className="flex-1" />
                        <Button
                          variant="default"
                          className="sm:w-auto w-full"
                          onClick={handleCopyMagicLink}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {isProjectManager && (
            <div className="mb-4 text-sm text-muted-foreground">
              Project managers can view the roster but cannot invite teammates or change roles.
            </div>
          )}
          <ProviderManagement
            technicians={technicianList}
            onRemove={handleRemoveTechnician}
            onRoleChange={canManageTeam ? handleRoleChange : undefined}
            updatingRoleId={updatingRoleId}
            currentUserId={currentUserId || undefined}
            currentUserMemberId={currentUserMemberId || undefined}
            currentUserRole={currentUserRole}
          />
        </div>
      </article>
      <Dialog
        open={removeDialogOpen}
        onOpenChange={(open) => {
          setRemoveDialogOpen(open);
          if (!open) setTechnicianToRemove(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove technician</DialogTitle>
            <DialogDescription>
              This technician will be removed from your team. You can re-invite
              them later if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">
            Are you sure you want to remove{" "}
            <span className="font-medium">
              {technicianToRemove?.name || "this technician"}
            </span>
            ?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveTechnician}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RoleChangeDialog
        open={canManageTeam && roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (!open) {
            setPendingRole(undefined);
            setPendingTechnician(null);
          }
        }}
        target={pendingTechnician}
        newRole={pendingRole}
        onConfirm={confirmOwnerChange}
        loading={!!updatingRoleId}
      />
    </main>
  );
}
