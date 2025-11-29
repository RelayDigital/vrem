"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { toast } from "sonner";

export default function SupportContactPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
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
    <div className="w-full">
      <div className="mb-md">
        <H2 className="text-2xl mb-2">Contact Support</H2>
        <Muted className="text-sm">
          Get in touch with our support team for assistance.
        </Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send a Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="pt-2">
            <Button onClick={handleSubmit}>Send Message</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

