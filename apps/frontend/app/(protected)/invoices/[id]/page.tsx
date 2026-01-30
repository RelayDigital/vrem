"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { api } from "@/lib/api";
import { Invoice, InvoiceStatus } from "@/types";
import { toast } from "sonner";
import { TeamLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { H1, H2, Muted } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  [InvoiceStatus.DRAFT]: { label: "Draft", variant: "secondary", icon: FileText },
  [InvoiceStatus.SENT]: { label: "Sent", variant: "default", icon: Send },
  [InvoiceStatus.PAID]: { label: "Paid", variant: "default", icon: CheckCircle2 },
  [InvoiceStatus.OVERDUE]: { label: "Overdue", variant: "destructive", icon: AlertTriangle },
  [InvoiceStatus.CANCELLED]: { label: "Cancelled", variant: "outline", icon: XCircle },
  [InvoiceStatus.VOID]: { label: "Void", variant: "outline", icon: XCircle },
};

function formatCurrency(amount: number, currency: string = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    user,
    isLoading: roleLoading,
    isAllowed,
  } = useRoleGuard(["COMPANY", "PROJECT_MANAGER"]);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const invoiceId = params.id as string;

  useEffect(() => {
    if (user && invoiceId) {
      loadInvoice();
    }
  }, [user, invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await api.invoices.get(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error("Failed to load invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      setActionLoading(true);
      await api.invoices.send(invoiceId);
      toast.success("Invoice sent to customer");
      loadInvoice();
    } catch (error) {
      toast.error("Failed to send invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setActionLoading(true);
      await api.invoices.markPaid(invoiceId);
      toast.success("Invoice marked as paid");
      loadInvoice();
    } catch (error) {
      toast.error("Failed to mark as paid");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    try {
      setActionLoading(true);
      await api.invoices.void(invoiceId);
      toast.success("Invoice voided");
      loadInvoice();
    } catch (error) {
      toast.error("Failed to void invoice");
    } finally {
      setActionLoading(false);
    }
  };

  if (roleLoading || loading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view invoices."
      />
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6 text-center py-20">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const config = statusConfig[invoice.status];
  const StatusIcon = config.icon;
  const items = invoice.items || [];

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/invoices")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Invoices
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <H1>Invoice INV-{String(invoice.invoiceNumber).padStart(4, "0")}</H1>
          <Muted>Created {formatDate(invoice.createdAt)}</Muted>
        </div>
        <Badge variant={config.variant} className="gap-1 text-sm px-3 py-1">
          <StatusIcon className="h-4 w-4" />
          {config.label}
        </Badge>
      </div>

      {/* Customer & Dates */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Muted className="text-xs">Customer</Muted>
              <p className="font-medium mt-1">
                {invoice.customer?.name || "No customer"}
              </p>
              {invoice.customer?.email && (
                <Muted className="text-xs">{invoice.customer.email}</Muted>
              )}
            </div>
            <div>
              <Muted className="text-xs">Due Date</Muted>
              <p className="font-medium mt-1">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <Muted className="text-xs">Project</Muted>
              <p className="font-medium mt-1">
                {invoice.project?.addressLine1 || "No project linked"}
              </p>
            </div>
          </div>
          {invoice.sentAt && (
            <div className="mt-4 pt-4 border-t">
              <Muted className="text-xs">Sent on {formatDate(invoice.sentAt)}</Muted>
            </div>
          )}
          {invoice.paidAt && (
            <div className="mt-2">
              <Muted className="text-xs text-green-600">Paid on {formatDate(invoice.paidAt)}</Muted>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {(invoice.taxRate ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({invoice.taxRate}%)
                </span>
                <span>
                  {formatCurrency(invoice.taxAmount, invoice.currency)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {invoice.status === InvoiceStatus.DRAFT && (
          <>
            <Button onClick={handleSend} disabled={actionLoading}>
              <Send className="h-4 w-4 mr-2" />
              Send to Customer
            </Button>
            <Button variant="outline" onClick={handleVoid} disabled={actionLoading}>
              <XCircle className="h-4 w-4 mr-2" />
              Void
            </Button>
          </>
        )}
        {(invoice.status === InvoiceStatus.SENT ||
          invoice.status === InvoiceStatus.OVERDUE) && (
          <>
            <Button onClick={handleMarkPaid} disabled={actionLoading}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
            <Button variant="outline" onClick={handleVoid} disabled={actionLoading}>
              <XCircle className="h-4 w-4 mr-2" />
              Void
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
