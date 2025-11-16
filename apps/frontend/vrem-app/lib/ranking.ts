import { Photographer, JobRequest, PhotographerRanking } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Score availability (0-100)
 * 100 = available on exact date
 * 0 = not available
 */
function scoreAvailability(
  photographer: Photographer,
  requestedDate: string
): number {
  const availability = photographer.availability.find(
    (a) => a.date === requestedDate
  );
  return availability?.available ? 100 : 0;
}

/**
 * Score distance (0-100)
 * 100 = 0-5km
 * 75 = 5-15km
 * 50 = 15-30km
 * 25 = 30-50km
 * 0 = 50km+
 */
function scoreDistance(distanceKm: number): number {
  if (distanceKm <= 5) return 100;
  if (distanceKm <= 15) return 75;
  if (distanceKm <= 30) return 50;
  if (distanceKm <= 50) return 25;
  return 0;
}

/**
 * Score reliability (0-100)
 * Based on on-time rate and no-show history
 */
function scoreReliability(photographer: Photographer): number {
  const { onTimeRate, noShows, totalJobs } = photographer.reliability;
  
  if (totalJobs === 0) return 50; // neutral for new photographers
  
  const noShowPenalty = (noShows / totalJobs) * 100;
  const reliabilityScore = onTimeRate * 100 - noShowPenalty;
  
  return Math.max(0, Math.min(100, reliabilityScore));
}

/**
 * Score skill match (0-100)
 * Based on photographer's skill ratings for required media types
 */
function scoreSkillMatch(
  photographer: Photographer,
  job: JobRequest
): number {
  const skillMap: Record<string, keyof Photographer['skills']> = {
    photo: 'residential',
    video: 'video',
    aerial: 'aerial',
    twilight: 'twilight',
  };
  
  let totalScore = 0;
  let count = 0;
  
  for (const mediaType of job.mediaType) {
    const skillKey = skillMap[mediaType];
    if (skillKey && photographer.skills[skillKey] !== undefined) {
      totalScore += photographer.skills[skillKey];
      count++;
    }
  }
  
  return count > 0 ? (totalScore / count) * 20 : 50; // Convert 1-5 rating to 0-100
}

/**
 * Score preferred relationship (0-100)
 * 100 = preferred client relationship exists OR photographer's company is a preferred vendor
 * 0 = no relationship
 */
function scorePreferredRelationship(
  photographer: Photographer,
  job: JobRequest,
  preferredVendorIds: string[] = []
): number {
  // Check if photographer's company is a preferred vendor
  if (photographer.companyId && preferredVendorIds.includes(photographer.companyId)) {
    return 100;
  }
  // Check if photographer has direct relationship with client
  if (photographer.preferredClients.includes(job.organizationId)) {
    return 100;
  }
  return 0;
}

/**
 * Calculate composite ranking score
 * Weights:
 * - Availability: 30% (hard requirement)
 * - Preferred Relationship/Vendor: 25% (significantly increased to favor relationships)
 * - Reliability: 20%
 * - Distance: 15%
 * - Skill: 10%
 */
export function rankPhotographers(
  photographers: Photographer[],
  job: JobRequest,
  preferredVendorIds: string[] = []
): PhotographerRanking[] {
  const weights = {
    availability: 0.3,
    preferredRelationship: 0.25, // Increased weight for preferred vendors
    reliability: 0.2,
    distance: 0.15,
    skill: 0.1,
  };
  
  const rankings: PhotographerRanking[] = photographers
    .filter((p) => p.status === 'active')
    .map((photographer) => {
      const distanceKm = calculateDistance(
        photographer.homeLocation.lat,
        photographer.homeLocation.lng,
        job.location.lat,
        job.location.lng
      );
      
      const factors = {
        availability: scoreAvailability(photographer, job.scheduledDate),
        distance: scoreDistance(distanceKm),
        distanceKm,
        reliability: scoreReliability(photographer),
        skillMatch: scoreSkillMatch(photographer, job),
        preferredRelationship: scorePreferredRelationship(photographer, job, preferredVendorIds),
      };
      
      const score =
        factors.availability * weights.availability +
        factors.preferredRelationship * weights.preferredRelationship +
        factors.reliability * weights.reliability +
        factors.distance * weights.distance +
        factors.skillMatch * weights.skill;
      
      return {
        photographer,
        score,
        factors,
        recommended: score >= 60 && factors.availability === 100,
      };
    })
    .sort((a, b) => b.score - a.score);
  
  return rankings;
}
