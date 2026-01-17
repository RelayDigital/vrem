"use client";

import { useState } from "react";
import { Button } from "../../../ui/button";
import { Card } from "../../../ui/card";
import { ScrollArea } from "../../../ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import {
  Organization,
  CompanyApplication,
  ProviderProfile,
} from "../../../../types";
import { CompanyCard, ApplicationCard } from "../../../common";
import { H2, H3, Small } from "../../../ui/typography";
import { Building2, Search } from "lucide-react";

interface CompaniesViewProps {
  provider: ProviderProfile;
  companies: Organization[];
  applications: CompanyApplication[];
  onApplyToCompany: (companyId: string, message: string) => void;
}

export function CompaniesView({
  provider,
  companies,
  applications,
  onApplyToCompany,
}: CompaniesViewProps) {
  const [showCompanySearch, setShowCompanySearch] = useState(false);

  const mediaCompanies = companies.filter((c) => c.type === "COMPANY");
  const pendingApplications = applications.filter(
    (a) => a.userId === provider.userId && a.status === "pending"
  );

  return (
    <main className="container mx-auto p-6 h-full space-y-6">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <H2 className="text-2xl border-0">Media Companies</H2>
          {provider.isIndependent && (
            <Button onClick={() => setShowCompanySearch(true)}>
              <Search className="h-4 w-4 mr-2" />
              Browse Companies
            </Button>
          )}
        </div>

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <Card className="p-6">
            <H3 className="text-lg mb-4">Pending Applications</H3>
            <div className="space-y-3">
              {pendingApplications.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))}
            </div>
          </Card>
        )}

        {/* Current Company */}
        {!provider.isIndependent && provider.companyId && (
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary rounded-xl">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <H3 className="text-lg">{provider.companyName}</H3>
                <Small className="text-muted-foreground">
                  Your current company
                </Small>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Company Search Dialog */}
      <Dialog open={showCompanySearch} onOpenChange={setShowCompanySearch}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Browse Media Companies</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-4 p-1">
              {mediaCompanies.map((company) => {
                const alreadyApplied = applications.some(
                  (a) =>
                    a.userId === provider.userId &&
                    a.companyId === company.id &&
                    a.status === "pending"
                );

                return (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onApply={onApplyToCompany}
                    isApplied={alreadyApplied}
                    showApplyButton={true}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
  );
}
