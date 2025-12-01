"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function SupportContactPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSubmit = () => {
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    // TODO: Implement contact form submission with API
    toast.success("Message sent successfully");
    setSubject("");
    setMessage("");
  };

  return (
    <SettingsRightContentSection
      id="contact"
      title="Contact Support"
      description="Get in touch with our support team for assistance."
      onSave={handleSubmit}
      saveButtonText="Send Message"
    >
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What can we help you with?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue or question..."
          rows={6}
        />
      </div>
    </SettingsRightContentSection>
  );
}
