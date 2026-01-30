"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { H1, Muted } from "@/components/ui/typography";
import {
  Plus,
  Receipt,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { CreateInvoiceDialog } from "@/components/features/invoices/CreateInvoiceDialog";

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

export default function InvoicesPage() {
  const router = useRouter();
  const {
    user,
    isLoading: roleLoading,
    isAllowed,
  } = useRoleGuard(["COMPANY", "PROJECT_MANAGER"]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const filterStatus = statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined;
      const data = await api.invoices.list(filterStatus ? { status: filterStatus } : undefined);
      setInvoices(data);
    } catch (error) {
      console.error("Failed to load invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user, loadInvoices]);

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await api.invoices.send(invoiceId);
      toast.success("Invoice sent successfully");
      loadInvoices();
    } catch (error) {
      toast.error("Failed to send invoice");
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await api.invoices.markPaid(invoiceId);
      toast.success("Invoice marked as paid");
      loadInvoices();
    } catch (error) {
      toast.error("Failed to mark invoice as paid");
    }
  };

  if (roleLoading) {
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

  // Summary stats
  const draftCount = invoices.filter((i) => i.status === InvoiceStatus.DRAFT).length;
  const sentCount = invoices.filter((i) => i.status === InvoiceStatus.SENT).length;
  const paidCount = invoices.filter((i) => i.status === InvoiceStatus.PAID).length;
  const overdueCount = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length;
  const totalOutstanding = invoices
    .filter((i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE)
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <H1>Invoices</H1>
          <Muted>Manage billing and invoices for your customers</Muted>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Muted className="text-xs">Draft</Muted>
            </div>
            <p className="text-2xl font-semibold mt-1">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <Muted className="text-xs">Sent</Muted>
            </div>
            <p className="text-2xl font-semibold mt-1">{sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <Muted className="text-xs">Paid</Muted>
            </div>
            <p className="text-2xl font-semibold mt-1">{paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <Muted className="text-xs">Overdue</Muted>
            </div>
            <p className="text-2xl font-semibold mt-1">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <Muted className="text-xs">Outstanding</Muted>
            </div>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(totalOutstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">All Invoices</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No invoices yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const config = statusConfig[invoice.status];
                  const StatusIcon = config.icon;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-medium">
                        INV-{String(invoice.invoiceNumber).padStart(4, "0")}
                      </TableCell>
                      <TableCell>
                        {invoice.customer?.name || "No customer"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoice.total, invoice.currency)}
                      </TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {invoice.status === InvoiceStatus.DRAFT && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendInvoice(invoice.id)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {(invoice.status === InvoiceStatus.SENT ||
                            invoice.status === InvoiceStatus.OVERDUE) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkPaid(invoice.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={() => {
          setShowCreateDialog(false);
          loadInvoices();
        }}
      />
    </div>
  );
}
