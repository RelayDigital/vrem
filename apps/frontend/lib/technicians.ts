import { Organization, OrganizationMember, Provider } from "@/types";
import { api } from "@/lib/api";

const DEFAULT_COORDINATES = { lat: 51.0447, lng: -114.0719 }; // Calgary fallback
const addressGeocodeCache = new Map<string, { lat: number; lng: number }>();

export function buildAddressString(
  personalOrg?: Partial<Organization> | null
) {
  if (!personalOrg) return "";
  const parts = [
    personalOrg.addressLine1,
    personalOrg.addressLine2,
    personalOrg.city,
    personalOrg.region,
    personalOrg.postalCode,
    personalOrg.countryCode,
  ].filter(Boolean);
  return parts.join(", ");
}

export async function geocodeAddress(address: string) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !address) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?access_token=${token}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const feature = data?.features?.[0];
    if (feature?.center?.length === 2) {
      const [lng, lat] = feature.center;
      return { lat, lng };
    }
  } catch (error) {
    console.error("Failed to geocode address", error);
  }

  return null;
}

export async function mapMemberToTechnician(
  member: OrganizationMember
): Promise<Provider | null> {
  if (!member.user) return null;

  const memberUser = member.user;
  const personalOrg = member.personalOrg;
  const addressString = buildAddressString(personalOrg);

  let coords = personalOrg?.lat !== undefined && personalOrg?.lng !== undefined
    ? { lat: personalOrg.lat, lng: personalOrg.lng }
    : DEFAULT_COORDINATES;

  if (addressString) {
    const cached = addressGeocodeCache.get(addressString);
    if (cached) {
      coords = cached;
    } else {
      const geocoded = await geocodeAddress(addressString);
      if (geocoded) {
        coords = geocoded;
        addressGeocodeCache.set(addressString, geocoded);
      }
    }
  }

  const technician: Provider = {
    id: memberUser.id,
    userId: memberUser.id,
    orgMemberId: member.id,
    orgId: member.orgId,
    memberId: member.id,
    role: (member.role || (member as any).orgRole || "TECHNICIAN") as any,
    name: memberUser.name || "Unnamed",
    email: memberUser.email || "",
    phone: personalOrg?.phone || "",
    organizationId: memberUser.organizationId || undefined,
    isIndependent: true,
    companyId: undefined,
    companyName: undefined,
    homeLocation: {
      lat: coords.lat,
      lng: coords.lng,
      address: {
        street: personalOrg?.addressLine1 || "",
        city: personalOrg?.city || "",
        stateProvince: personalOrg?.region || "",
        country: personalOrg?.countryCode || "",
        postalCode: personalOrg?.postalCode || "",
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
    createdAt: member.createdAt ? new Date(member.createdAt) : new Date(),
    avatar: memberUser.avatarUrl,
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

  return technician;
}

export async function fetchOrganizationTechnicians(): Promise<Provider[]> {
  const members = await api.organizations.listMembers();
  if (!members || members.length === 0) return [];

  const technicians = await Promise.all(
    members.map((member) => mapMemberToTechnician(member))
  );

  // Always include providers with personal organization details filled.
  // For company orgs, the API should return company technicians via listMembers.
  return technicians.filter(
    (technician): technician is Provider => Boolean(technician)
  );
}
