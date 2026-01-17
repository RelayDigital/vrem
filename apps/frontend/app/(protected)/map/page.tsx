"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { LiveJobMapView } from "@/components/features/company/views/LiveJobMapView";
import { JobRequest, Technician } from "@/types";
import { MapLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { JobDataBoundary } from "@/components/shared/jobs";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { getEffectiveOrgRole, isCompanyRole } from "@/lib/roles";
import { Organization } from "@/types";
import { api } from "@/lib/api";
import { geocodeAddress } from "@/lib/technicians";

export default function MapPage() {
  const { user, isLoading, memberships, organizationId } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();
  const jobManagement = useJobManagement();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [orgGeocodedCoords, setOrgGeocodedCoords] = useState<
    { lat: number; lng: number } | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const loadTechnicians = async () => {
      setLoadingTechnicians(true);
      try {
        const techniciansFromMembers = await fetchOrganizationTechnicians();

        if (!cancelled) {
          setTechnicians(techniciansFromMembers);
        }
      } catch (error) {
        console.error("Failed to load technicians for map:", error);
        if (!cancelled) {
          setTechnicians([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTechnicians(false);
        }
      }
    };

    if (user) {
      loadTechnicians();
    } else {
      setTechnicians([]);
      setLoadingTechnicians(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadOrg = async () => {
      if (!organizationId) {
        setOrgDetails(null);
        return;
      }
      try {
        const org = await api.organizations.getById(organizationId);
        if (!cancelled) {
          setOrgDetails(org);
        }
      } catch (error) {
        if (!cancelled) {
          setOrgDetails(null);
          console.error("Failed to load organization for map", error);
        }
      }
    };
    if (user) {
      loadOrg();
    } else {
      setOrgDetails(null);
    }
    return () => {
      cancelled = true;
    };
  }, [organizationId, user]);

  const effectiveRole = getEffectiveOrgRole(user, memberships, organizationId);
  const companyElevated = isCompanyRole(effectiveRole);
  const activeMembership = memberships.find((m) => m.orgId === organizationId);

  // Use orgDetails (full data from API) if available, otherwise fall back to membership.organization
  const activeOrg =
    (orgDetails as Organization | null) ||
    (activeMembership?.organization as Organization | undefined);

  // Check organization type from multiple sources for robustness
  const membershipOrgType = activeMembership?.organization?.type;
  const isPersonalOrg =
    membershipOrgType === "PERSONAL" ||
    activeOrg?.type === "PERSONAL" ||
    (activeMembership as any)?.organizationType === "PERSONAL";

  // Get location from orgDetails (full API response) since membership.organization doesn't include lat/lng
  const orgLatRaw = orgDetails?.lat;
  const orgLngRaw = orgDetails?.lng;
  const orgLat =
    typeof orgLatRaw === "string" ? parseFloat(orgLatRaw) : orgLatRaw;
  const orgLng =
    typeof orgLngRaw === "string" ? parseFloat(orgLngRaw) : orgLngRaw;
  const hasOrgLocation =
    typeof orgLat === "number" &&
    !Number.isNaN(orgLat) &&
    typeof orgLng === "number" &&
    !Number.isNaN(orgLng);

  // Geocode org address if lat/lng not available
  // Only runs when orgDetails is loaded (full API response with address fields)
  useEffect(() => {
    const tryGeocode = async () => {
      // Skip if we already have coordinates from orgDetails
      if (hasOrgLocation) return;
      // Skip if orgDetails hasn't loaded yet (need full org data for address fields)
      if (!orgDetails) return;

      const addressParts = [
        orgDetails.addressLine1,
        orgDetails.addressLine2,
        orgDetails.city,
        orgDetails.region,
        orgDetails.postalCode,
        orgDetails.countryCode,
      ].filter(Boolean);

      if (!addressParts.length) {
        // No address - don't show marker
        return;
      }

      const addressString = addressParts.join(", ");
      try {
        const coords = await geocodeAddress(addressString);
        if (coords) {
          setOrgGeocodedCoords(coords);
        } else {
          // Geocoding failed - don't show marker
          console.warn("Geocoding returned no results for org address");
        }
      } catch (error) {
        console.error("Failed to geocode org address for map:", error);
      }
    };
    void tryGeocode();
  }, [orgDetails, hasOrgLocation]);

  const selfTechnician: Technician | null = useMemo(() => {
    // Show self marker in personal org for any account type with a location
    // Requires orgDetails to be loaded for location data
    if (
      !user ||
      !isPersonalOrg ||
      (!hasOrgLocation && !orgGeocodedCoords)
    ) {
      return null;
    }
    return {
      id: user.id,
      userId: user.id,
      orgMemberId: activeMembership?.id || user.id,
      orgId: organizationId || activeMembership?.orgId || orgDetails?.id || user.organizationId || "",
      memberId: activeMembership?.id,
      organizationId: orgDetails?.id,
      role: "TECHNICIAN",
      name: user.name || "Me",
      email: user.email || "",
      phone: orgDetails?.phone || "",
      isIndependent: true,
      companyId: undefined,
      companyName: undefined,
      homeLocation: {
        lat: (hasOrgLocation ? orgLat : orgGeocodedCoords?.lat) as number,
        lng: (hasOrgLocation ? orgLng : orgGeocodedCoords?.lng) as number,
        address: {
          street: orgDetails?.addressLine1 || "",
          city: orgDetails?.city || "",
          stateProvince: orgDetails?.region || "",
          country: orgDetails?.countryCode || "",
          postalCode: orgDetails?.postalCode || "",
        },
      },
      availability: [],
      reliability: {
        totalJobs: 0,
        noShows: 0,
        lateDeliveries: 0,
        onTimeRate: 0,
        averageDeliveryTime: 0,
      },
      skills: {
        residential: 0,
        commercial: 0,
        aerial: 0,
        twilight: 0,
        video: 0,
      },
      rating: {
        overall: 0,
        count: 0,
        recent: [],
      },
      preferredClients: [],
      status: "active",
      createdAt: new Date(),
      avatar: user.avatarUrl,
      bio: "",
      services: {
        photography: true,
        video: false,
        aerial: false,
        floorplan: false,
        measurement: false,
        twilight: false,
        editing: false,
        virtualStaging: false,
      },
      portfolio: [],
      certifications: [],
    };
  }, [
    activeMembership,
    orgDetails,
    hasOrgLocation,
    isPersonalOrg,
    organizationId,
    orgGeocodedCoords,
    orgLat,
    orgLng,
    user,
  ]);

  // Filter jobs based on role
  const displayJobs = useMemo(() => {
    if (!user) return [];

    const activeMembership = memberships.find((m) => m.orgId === organizationId);
    const roleUpper = (
      (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
    ).toUpperCase();

    // Company/Admin/Owner/Project Manager: Show all jobs
    if (companyElevated) {
      return jobManagement.jobs;
    }

    // TECHNICIAN: Only show jobs where they are assigned as technician
    if (roleUpper === "TECHNICIAN") {
      return jobManagement.jobs.filter(
        (job) => job.assignedTechnicianId === user.id
      );
    }

    // EDITOR: Only show jobs where they are assigned as editor
    if (roleUpper === "EDITOR") {
      return jobManagement.jobs.filter(
        (job) => job.editorId === user.id
      );
    }

    // Fallback: filter by technician or editor assignment
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedTechnicianId === user.id ||
        job.editorId === user.id
    );
  }, [companyElevated, jobManagement.jobs, memberships, organizationId, user]);

  // Filter technicians based on role
  const displayTechnicians = useMemo(() => {
    if (!user) return [];

    // Get the actual membership role (not the simplified effectiveRole)
    const activeMembership = memberships.find((m) => m.orgId === organizationId);
    const membershipRole = (
      (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
    ).toUpperCase();

    // Company/Admin/Owner/Project Manager: show all technicians
    if (companyElevated) {
      const hasSelf = technicians.some((t) => t.id === user.id);
      if (!hasSelf && selfTechnician) {
        return [selfTechnician, ...technicians];
      }
      return technicians;
    }

    // EDITOR: should not see any technicians on the map
    // They only see jobs they're assigned to edit, not technician locations
    if (membershipRole === "EDITOR") {
      return [];
    }

    // TECHNICIAN: only those involved in their jobs + self
    if (membershipRole === "TECHNICIAN") {
      const ids = new Set(
        displayJobs
          .map((job) => job.assignedTechnicianId || job.assignedTechnicianId)
          .filter((id): id is string => Boolean(id))
      );
      const filtered = technicians.filter(
        (p) => ids.has(p.id) || p.id === user.id
      );
      if (!filtered.find((p) => p.id === user.id)) {
        const self = technicians.find((p) => p.id === user.id) || selfTechnician;
        return self ? [self, ...filtered] : filtered;
      }
      return filtered;
    }

    // Default: show all technicians (for any other roles)
    if (selfTechnician && !technicians.some((t) => t.id === user.id)) {
      return [selfTechnician, ...technicians];
    }
    return technicians;
  }, [
    companyElevated,
    displayJobs,
    memberships,
    organizationId,
    selfTechnician,
    technicians,
    user,
  ]);

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null; // Redirect handled by hook
  }

  // Show skeleton while loading technicians - map needs this data
  if (loadingTechnicians) {
    return <MapLoadingSkeleton />;
  }

  const userRole = effectiveRole;
  const canAssignJobs = isCompanyRole(userRole);
  const isDispatcherView = canAssignJobs; // Only org managers see "Pending Assignments" language

  const handleJobSelect = (job: JobRequest) => {
    if (jobManagement.selectedJob?.id === job.id) {
      jobManagement.selectJob(null);
    } else {
      jobManagement.selectJob(job);
    }
  };

  const handleJobAssign = canAssignJobs ? jobManagement.assignJob : undefined;

  const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
    jobManagement.selectJob(job);
    router.push(`/jobs/${job.id}`);
  };

  return (
    <JobDataBoundary fallback={<MapLoadingSkeleton />}>
      <LiveJobMapView
        jobs={displayJobs}
        technicians={displayTechnicians}
        selectedJob={jobManagement.selectedJob}
        onSelectJob={handleJobSelect}
        onNavigateToJobInProjectManagement=
          {handleNavigateToJobInProjectManagement}
        onJobAssign={handleJobAssign}
        hasSidebar={canAssignJobs}
        isDispatcherView={isDispatcherView}
      />
    </JobDataBoundary>
  );
}
