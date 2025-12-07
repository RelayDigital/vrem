"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Customer } from "@/components/shared/tables/CustomersTable";
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
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { H2, P } from "@/components/ui/typography";
import { api } from "@/lib/api";
import { CustomerManagement } from "../../customer/CustomerManagement";
import { useOrgPermissions } from "@/hooks/useProjectPermissions";

interface CustomersViewProps {
  customers: Customer[];
  isLoading?: boolean;
}

export function CustomersView({
  customers,
  isLoading = false,
}: CustomersViewProps) {
  // Permission check: only OWNER/ADMIN can manage customers (create/edit/delete)
  const { canManageCustomers } = useOrgPermissions();
  
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<Customer[]>([]);
  const [importPreview, setImportPreview] = useState<{
    headers: string[];
    firstRow: string[];
    normalizedHeaders: string[];
    rows: string[][];
  } | null>(null);
  const [importMapping, setImportMapping] = useState<
    Record<string, number | null>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCustomerList(customers);
    setSelectedIds([]);
  }, [customers]);

  const normalizeHeader = (header: string) =>
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      notes: "",
    });
    setEditingCustomer(null);
  };

  const escapeCsvValue = (value: string | number | null | undefined) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && text[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentValue);
        if (currentRow.some((cell) => cell.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = "";
        continue;
      }

      currentValue += char;
    }

    if (currentValue.length > 0 || currentRow.length > 0) {
      currentRow.push(currentValue);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const handleExport = () => {
    const headers = [
      "id",
      "orgId",
      "name",
      "email",
      "phone",
      "notes",
      "jobs",
      "userId",
      "createdAt",
      "updatedAt",
    ];

    const source =
      selectedCustomers.length > 0 ? selectedCustomers : customerList;

    const rows = source.map((customer) => [
      customer.id,
      customer.orgId ?? "",
      customer.name ?? "",
      customer.email ?? "",
      customer.phone ?? "",
      customer.notes ?? "",
      customer.totalJobs ?? 0,
      customer.userId ?? "",
      customer.createdAt ? new Date(customer.createdAt).toISOString() : "",
      customer.updatedAt ? new Date(customer.updatedAt).toISOString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `customers-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Customers exported");
  };

  const handleImportClick = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const [headerRow, ...dataRows] = parseCsv(text);

      if (!headerRow || headerRow.length === 0) {
        toast.error("CSV is missing headers");
        return;
      }

      const normalizedHeaders = headerRow.map(normalizeHeader);
      setImportPreview({
        headers: headerRow,
        firstRow: dataRows[0] || [],
        normalizedHeaders,
        rows: dataRows,
      });
      const defaultMapping: Record<string, number | null> = {};
      schemaFields.forEach((field) => {
        const idx = normalizedHeaders.indexOf(field.matchKey);
        defaultMapping[field.matchKey] = idx >= 0 ? idx : null;
      });
      setImportMapping(defaultMapping);
      const missingRequired = schemaFields.filter(
        (f) => f.required && !normalizedHeaders.includes(f.matchKey)
      );
      if (missingRequired.length) {
        toast.info(
          "Required columns missing. Map headers to required fields to import."
        );
      }
      setImportDialogOpen(true);
    } catch (error) {
      console.error("Failed to import customers", error);
      toast.error("Unable to import customers");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;

    const getIndexForField = (matchKey: string) => {
      if (importMapping.hasOwnProperty(matchKey)) {
        const val = importMapping[matchKey];
        return typeof val === "number" ? val : -1;
      }
      return importPreview.normalizedHeaders.indexOf(matchKey);
    };

    const hasMissingRequired = schemaFields.some((field) => {
      if (!field.required) return false;
      return getIndexForField(field.matchKey) < 0;
    });

    if (hasMissingRequired) {
      toast.error("Map all required fields before importing");
      return;
    }

    const payloads = importPreview.rows
      .map((row) => {
        const nameIdx = getIndexForField("name");
        const name = nameIdx >= 0 ? row[nameIdx]?.trim() : "";
        if (!name) return null;

        const emailIdx = getIndexForField("email");
        const phoneIdx = getIndexForField("phone");
        const notesIdx = getIndexForField("notes");

        return {
          name,
          email: emailIdx >= 0 ? row[emailIdx]?.trim() : undefined,
          phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined,
          notes: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
        };
      })
      .filter(Boolean) as Array<{
      name: string;
      email?: string;
      phone?: string;
      notes?: string;
    }>;

    if (!payloads.length) {
      toast.error("No valid rows to import. Check your mappings.");
      return;
    }

    setIsImporting(true);
    try {
      const results = await Promise.all(
        payloads.map(async (payload) => {
          try {
            const response = await api.customers.create(payload);
            // Return customer if created, null for invitations
            if (response.type === "customer_created" && response.customer) {
              return response.customer;
            }
            return null;
          } catch (error) {
            console.error("Failed to import customer row", error);
            return null;
          }
        })
      );

      const imported = results.filter(Boolean) as Customer[];
      if (imported.length) {
        setCustomerList((prev) => [...imported, ...prev]);
        toast.success(
          `Imported ${imported.length} customer${
            imported.length === 1 ? "" : "s"
          }`
        );
      } else {
        toast.error("Unable to import customers");
      }
    } catch (error) {
      console.error("Failed to import customers", error);
      toast.error("Unable to import customers");
    } finally {
      setIsImporting(false);
      setImportDialogOpen(false);
      setImportPreview(null);
      setImportMapping({});
    }
  };

  const schemaFields = [
    {
      label: "Name",
      matchKey: normalizeHeader("name"),
      dbField: "name",
      required: true,
      type: "text",
    },
    {
      label: "Email",
      matchKey: normalizeHeader("email"),
      dbField: "email",
      required: false,
      type: "text",
    },
    {
      label: "Phone",
      matchKey: normalizeHeader("phone"),
      dbField: "phone",
      required: false,
      type: "text",
    },
    {
      label: "Notes",
      matchKey: normalizeHeader("notes"),
      dbField: "notes",
      required: false,
      type: "text",
    },
  ];

  const hasMissingRequiredColumn =
    !!importPreview &&
    schemaFields.some((field) => {
      if (!field.required) return false;
      const mapped = importMapping[field.matchKey];
      if (mapped === null) return true;
      const idx =
        typeof mapped === "number" && mapped >= 0
          ? mapped
          : importPreview.normalizedHeaders.indexOf(field.matchKey);
      return idx < 0;
    });

  const getMappedIndex = (fieldKey: string) => {
    if (importMapping.hasOwnProperty(fieldKey)) {
      const val = importMapping[fieldKey];
      if (typeof val === "number") return val;
      if (val === null) return -1;
    }
    return importPreview?.normalizedHeaders.indexOf(fieldKey) ?? -1;
  };

  const readyImportRowCount =
    importPreview &&
    importPreview.rows.filter((row) => {
      const nameIdx = getMappedIndex("name");
      if (nameIdx < 0) return false;
      const name = row[nameIdx]?.trim();
      return !!name;
    }).length;

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (editingCustomer) {
        const updated = await api.customers.update?.(
          editingCustomer.id,
          payload
        );
        const merged = updated ?? { ...editingCustomer, ...payload };
        setCustomerList((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? merged : c))
        );
        toast.success("Customer updated");
      } else {
        const response = await api.customers.create(payload);
        
        // Handle different response types
        switch (response.type) {
          case "customer_created":
            if (response.customer) {
              setCustomerList((prev) => [response.customer!, ...prev]);
              toast.success("Customer added");
            }
            break;
          case "invitation_sent":
            toast.success(response.message || `Invitation sent to ${payload.email}`);
            break;
          case "invitation_pending":
            toast.info(response.message || `An invitation is already pending for ${payload.email}`);
            break;
          case "existing_customer":
            toast.info(response.message || `${payload.email} is already a customer`);
            if (response.customer) {
              // Refresh the list to ensure we have the latest
              const customers = await api.customers.list();
              setCustomerList(customers);
            }
            break;
          case "existing_customer_linked":
            toast.success(response.message || `${payload.email} has been linked to their account`);
            if (response.customer) {
              // Refresh the list to get the updated customer with userId
              const customers = await api.customers.list();
              setCustomerList(customers);
            }
            break;
          default:
            // Fallback for backward compatibility
            if (response.customer) {
              setCustomerList((prev) => [response.customer!, ...prev]);
              toast.success("Customer added");
            }
        }
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create customer", error);
      toast.error("Unable to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (customer: Customer) => {
    if (customer.userId) return;
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const handleConfirmDeleteClick = (customer: Customer) => {
    setDeleteTargets([customer]);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    const targets = customerList.filter((c) => selectedIds.includes(c.id));
    if (!targets.length) return;
    setDeleteTargets(targets);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    setDeletingId(customer.id);
    try {
      if (api.customers.delete) {
        await api.customers.delete(customer.id);
      }
      setCustomerList((prev) => prev.filter((c) => c.id !== customer.id));
      setSelectedIds((prev) => prev.filter((id) => id !== customer.id));
      toast.success("Customer deleted");
    } catch (error) {
      console.error("Failed to delete customer", error);
      toast.error("Unable to delete customer");
    } finally {
      setDeletingId(null);
      setDeleteConfirmOpen(false);
      setDeleteTargets([]);
    }
  };

  const handleDeleteTargets = async () => {
    if (!deleteTargets.length) return;
    const ids = deleteTargets.map((c) => c.id);
    setIsDeleting(true);
    setDeletingId(deleteTargets.length === 1 ? deleteTargets[0].id : "bulk");
    try {
      if (api.customers.delete) {
        await Promise.all(ids.map((id) => api.customers.delete!(id)));
      }
      setCustomerList((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success(
        `Deleted ${ids.length} customer${ids.length === 1 ? "" : "s"}`
      );
    } catch (error) {
      console.error("Failed to delete customers", error);
      toast.error("Unable to delete customers");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
      setDeleteConfirmOpen(false);
      setDeleteTargets([]);
    }
  };

  const handleToggleSelect = (customerId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (selected) {
        set.add(customerId);
      } else {
        set.delete(customerId);
      }
      return Array.from(set);
    });
  };

  const handleToggleSelectAll = (customerIds: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      customerIds.forEach((id) => {
        if (selected) {
          set.add(id);
        } else {
          set.delete(id);
        }
      });
      return Array.from(set);
    });
  };

  const selectedCustomers = customerList.filter((c) =>
    selectedIds.includes(c.id)
  );

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-4xl mb-xs">Customers</H2>
            <div className="flex gap-2">
              {/* Bulk delete - only visible to users who can manage customers */}
              {canManageCustomers && selectedCustomers.length > 0 && !isDeleting && (
                <>
                  <P className="text-destructive self-center">
                    {selectedCustomers.length} selected
                  </P>
                  <Button
                    variant="destructive"
                    className={`px-3 border-none self-center`}
                    disabled={selectedCustomers.length === 0 || isDeleting}
                    onClick={handleConfirmBulkDelete}
                  >
                    Delete Selected
                  </Button>
                </>
              )}
              {/* Import/Export - only visible to users who can manage customers */}
              {canManageCustomers && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="px-0"
                        disabled={isImporting}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Import/Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExport}
                        disabled={selectedCustomers.length === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleImportClick}
                        disabled={isImporting}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {/* Add Customer dialog - only visible to users who can manage customers */}
              {canManageCustomers && (
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="default" className="px-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomer ? "Edit Customer" : "Add Customer"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCustomer
                        ? "Update customer contact details."
                        : "Capture contact details for a new customer."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="customer-name">Name</Label>
                      <Input
                        id="customer-name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Jane Cooper"
                        autoFocus
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customer-email">Email</Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="jane@example.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="customer-phone">Phone</Label>
                        <Input
                          id="customer-phone"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-notes">Notes</Label>
                      <Textarea
                        id="customer-notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Preferences, access details, or context"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                      {isSaving
                        ? editingCustomer
                          ? "Saving..."
                          : "Adding..."
                        : editingCustomer
                        ? "Save Changes"
                        : "Add Customer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>
          <CustomerManagement
            customers={customerList}
            isLoading={isLoading}
            onEdit={canManageCustomers ? handleStartEdit : undefined}
            onDelete={canManageCustomers ? handleConfirmDeleteClick : undefined}
            deletingId={deletingId}
            isDeleting={isDeleting}
            selectedIds={canManageCustomers ? selectedIds : []}
            onToggleSelect={canManageCustomers ? handleToggleSelect : undefined}
            onToggleSelectAll={canManageCustomers ? handleToggleSelectAll : undefined}
          />
        </div>
      </article>
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportPreview(null);
            setImportMapping({});
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="space-y-1">
            <DialogTitle>CSV Import</DialogTitle>
            <DialogDescription>
              Mapping is fixed to the customer table. Ensure required columns
              are present before importing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-medium">Schema mapping</div>
              <p className="text-muted-foreground">
                CSV column names must match the database fields below. Missing
                required fields are highlighted.
              </p>
            </div>
            <div className="rounded-lg border">
              <div className="grid grid-cols-4 gap-3 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>CSV column</span>
                <span>Database field</span>
                <span>Field type</span>
                <span>Sample</span>
              </div>
              <Separator />
              <div className="divide-y">
                {schemaFields.map((field) => {
                  const idx = getMappedIndex(field.matchKey);
                  const missing = idx === -1;
                  const headerLabel =
                    idx >= 0
                      ? importPreview?.headers[idx] ?? field.label
                      : "Select column";
                  const sample =
                    idx >= 0 && importPreview
                      ? importPreview.firstRow[idx] ?? "—"
                      : "—";
                  return (
                    <div
                      key={field.matchKey}
                      className="grid grid-cols-4 gap-3 px-4 py-3 items-center"
                    >
                      <div className="flex items-center gap-2">
                        {missing ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{headerLabel}</span>
                          <span className="text-xs text-muted-foreground">
                            {field.required ? "Required" : "Optional"}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-mono">{field.dbField}</div>
                      <div className="text-sm capitalize">{field.type}</div>
                      <div className="space-y-2">
                        <Select
                          value={idx >= 0 ? String(idx) : "unmapped"}
                          onValueChange={(value) => {
                            setImportMapping((prev) => ({
                              ...prev,
                              [field.matchKey]:
                                value === "unmapped" ? null : Number(value),
                            }));
                          }}
                          disabled={!importPreview}
                        >
                          <SelectTrigger variant="muted">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">Not mapped</SelectItem>
                            {importPreview?.headers.map((header, index) => (
                              <SelectItem
                                key={`${header || "column"}-${index}`}
                                value={String(index)}
                              >
                                {header || `Column ${index + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-sm text-muted-foreground break-all">
                        {sample || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {importPreview && (
              <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Import summary</span>
                  <span className="text-muted-foreground">
                    {readyImportRowCount || 0} row
                    {readyImportRowCount === 1 ? "" : "s"} ready to import
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportPreview(null);
                setImportMapping({});
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={
                !importPreview ||
                isImporting ||
                hasMissingRequiredColumn ||
                !readyImportRowCount
              }
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteTargets([]);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete customer</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The customer will be removed from
              your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              {deleteTargets.length === 1 ? (
                <span className="font-medium">
                  {deleteTargets[0]?.name || "this customer"}
                </span>
              ) : (
                <span className="font-medium">
                  {deleteTargets.length} customers
                </span>
              )}
              ?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={!!isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTargets}
              disabled={deleteTargets.length === 0 || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
