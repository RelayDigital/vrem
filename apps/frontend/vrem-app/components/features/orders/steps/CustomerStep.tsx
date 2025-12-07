'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { H2, P, Muted } from '@/components/ui/typography';
import {
  Search,
  UserPlus,
  User,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Customer } from '@/types';
import { cn } from '@/lib/utils';

interface CustomerStepProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onSelect: (customer: Customer | null, newCustomer?: { name: string; email?: string; phone?: string; notes?: string }) => void;
  onBack?: () => void;
}

export function CustomerStep({
  customers,
  selectedCustomerId,
  onSelect,
  onBack,
}: CustomerStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
    );
  }, [customers, searchQuery]);

  const handleSelectExisting = (customer: Customer) => {
    onSelect(customer);
  };

  const handleCreateNew = () => {
    if (!newCustomer.name.trim()) return;
    onSelect(null, {
      name: newCustomer.name.trim(),
      email: newCustomer.email.trim() || undefined,
      phone: newCustomer.phone.trim() || undefined,
      notes: newCustomer.notes.trim() || undefined,
    });
  };

  const isValidNewCustomer = newCustomer.name.trim().length > 0;

  return (
    <motion.div
      key="customer"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="container mx-auto p-6 h-full"
    >
      <div
        className="container mx-auto space-y-6"
        style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-primary font-medium">Select customer</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-muted-foreground/60">Property address</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-muted-foreground/60">Schedule</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <H2 className="text-2xl border-0">Who is this order for?</H2>
          <P className="text-muted-foreground">
            Select an existing customer or create a new one
          </P>
        </div>

        {!showCreateForm ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectExisting(customer)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      selectedCustomerId === customer.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div className="p-3 bg-muted rounded-full">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {customer.name}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {customer.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedCustomerId === customer.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No customers found' : 'No customers yet'}
                </div>
              )}
            </div>

            {/* Create New Button */}
            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <UserPlus className="h-5 w-5" />
              Create New Customer
            </Button>
          </>
        ) : (
          /* Create Customer Form */
          <div className="bg-card rounded-2xl border-2 border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <H2 className="text-xl border-0">New Customer</H2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Customer name"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes about this customer..."
                  value={newCustomer.notes}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!isValidNewCustomer}
                onClick={handleCreateNew}
              >
                Create & Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {!showCreateForm && (
          <div className="flex gap-3 pt-4">
            {onBack && (
              <Button variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

