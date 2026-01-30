"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  projectId?: string;
  customerId?: string;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onCreated,
  projectId,
  customerId,
}: CreateInvoiceDialogProps) {
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setTaxRate(0);
      setDueDate("");
      setNotes("");
    }
  }, [open]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * Math.round(item.unitPrice * 100),
    0
  );
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);

  const handleSubmit = async () => {
    // Validate
    const validItems = items.filter((item) => item.description.trim() && item.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one line item with a description and price");
      return;
    }

    try {
      setSaving(true);
      await api.invoices.create({
        customerId: customerId || undefined,
        projectId: projectId || undefined,
        items: validItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Math.round(item.unitPrice * 100),
        })),
        taxRate: taxRate || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
      toast.success("Invoice created");
      onCreated();
    } catch (error) {
      console.error("Failed to create invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a customer. The invoice will be saved as a draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Line Items */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Line Items</Label>
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Price"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="w-24 text-right text-sm pt-2 text-muted-foreground">
                  {formatCurrency(item.quantity * Math.round(item.unitPrice * 100))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Tax & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={taxRate || ""}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the customer..."
              rows={3}
            />
          </div>

          {/* Totals Summary */}
          <div className="border-t pt-4 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({taxRate}%)
                </span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Draft Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
