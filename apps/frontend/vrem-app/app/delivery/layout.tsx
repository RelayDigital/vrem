import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Delivery",
  description: "View and approve your media delivery",
};

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
