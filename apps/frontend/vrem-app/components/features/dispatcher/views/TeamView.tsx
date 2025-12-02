"use client";

import { useEffect, useMemo, useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Technician } from "../../../../types";
import { TechnicianManagement } from "../../technician";

interface TeamViewProps {
  technicians: Technician[];
}

export function TeamView({ technicians }: TeamViewProps) {
  const [technicianList, setTechnicianList] = useState<Technician[]>(technicians);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [magicLink, setMagicLink] = useState("https://app.vrem.io/invite/team");
  const { activeOrganizationId } = useCurrentOrganization();

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
  }, [technicians]);

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
          api.organizations.createInvite(email, "TECHNICIAN")
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
        Technician
      </Badge>
    </div>
  );

  const openDialogAndFocusInput = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      setInviteEmails([]);
      setEmailInput("");
    }
  };

  const handleRemoveTechnician = (technician: Technician) => {
    if (!confirm(`Remove ${technician.name || "technician"} from the team?`)) {
      return;
    }
    setTechnicianList((prev) => prev.filter((t) => t.id !== technician.id));
    toast.success("Technician removed from team");
  };

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-4xl mb-xs">Team</H2>
            <Dialog open={inviteOpen} onOpenChange={openDialogAndFocusInput}>
              <DialogTrigger asChild>
                <Button variant="default" className="px-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Teammate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle className="text-xl">
                    Invite people to your team
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Send email invites or share a magic link to bring teammates
                    on board.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold">
                      Invite teammates
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <div className="flex flex-1 flex-col gap-0 sm:flex-row">
                        <div className="flex max-w-1/2 overflow-x-scroll scrollbar-hide">
                          {inviteEmails.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {email}
                              <Button
                                variant="mutedFlat"
                                className="p-0 w-auto ml-0.5"
                                onClick={() => handleRemoveEmail(email)}
                                aria-label={`Remove ${email}`}
                                size="icon-sm"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
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
                      <Button
                        onClick={handleSendInvites}
                        disabled={isInviting}
                        className="sm:w-auto w-full"
                      >
                        {isInviting ? "Sending..." : "Invite"}
                      </Button>
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
          </div>
          <TechnicianManagement
            technicians={technicianList}
            onRemove={handleRemoveTechnician}
          />
        </div>
      </article>
    </main>
  );
}
