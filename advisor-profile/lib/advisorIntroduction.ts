import { formatExperienceOnPlatform } from '@/lib/agentProfileDisplay'
import { getAdvisorById } from '@/lib/advisorsDirectory'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import type { MatchedAdvisor } from '@/lib/matchAdvisors'

export type AdvisorIntroductionContent = {
  displayName: string
  firstName: string
  bio: string
  videoUrl: string
  videoPosterUrl: string
  videoDurationLabel: string
}

/** Short stock clips (Mixkit license) — travel-advisor style intros for demo. */
const DEFAULT_INTRO_VIDEO =
  'https://assets.mixkit.co/videos/preview/mixkit-travel-agent-planning-a-trip-on-a-map-42878-large.mp4'

const PERSONA_VIDEOS: Record<string, string> = {
  'priya-rajan':
    'https://assets.mixkit.co/videos/preview/mixkit-woman-talking-on-a-video-call-while-traveling-42926-large.mp4',
  'elena-vogt':
    'https://assets.mixkit.co/videos/preview/mixkit-person-talking-on-a-video-call-42925-large.mp4',
  'marcus-bell':
    'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-42927-large.mp4',
}

function advisorFirstName(displayName: string): string {
  const primary = displayName.split(/\s*[-–]\s*/)[0]?.trim() || displayName
  return primary.split(/\s+/)[0] || displayName
}

function buildProfileBio(profile: AgentProfile, displayName: string): string {
  const location = [profile.city, profile.country].filter(Boolean).join(', ')
  const tenure = formatExperienceOnPlatform(profile)
  const cities =
    profile.bookingCities.length > 0
      ? profile.bookingCities.slice(0, 4).map((c) => c.city)
      : profile.topDestinations

  const destinationLine =
    cities.length > 0
      ? `Recent verified bookings span ${cities.join(', ')}${cities.length >= 4 ? ', and more' : ''}.`
      : 'They book across a growing set of destinations on the TravelConnect platform.'

  const focus = profile.agentBookingTypeLabel
    ? `${profile.agentBookingTypeLabel}. `
    : ''

  const style = profile.travelStyleTag
    ? `Known for ${profile.travelStyleTag.toLowerCase()} itineraries and ${profile.budgetTier.toLowerCase()} positioning. `
    : ''

  const locationBit = location
    ? `${displayName} is a TravelConnect Verified Partner based in ${location}. `
    : `${displayName} is a TravelConnect Verified Partner on TravelConnect. `

  return `${locationBit}With ${tenure.toLowerCase()} on the platform, ${focus}${style}${destinationLine} Every itinerary starts with how you want to travel — pace, budget, and the experiences that matter — then they handle hotels, timing, and platform booking through TravelConnect.`
}

export function getAdvisorIntroduction(
  persona: MatchedAdvisor,
  agentProfile: AgentProfile | null,
): AdvisorIntroductionContent {
  const displayName = agentProfile?.agencyName || persona.name
  const firstName = advisorFirstName(displayName)
  const directory = getAdvisorById(persona.id)

  const bio =
    directory?.bio ??
    (agentProfile ? buildProfileBio(agentProfile, displayName) : persona.llmContext)

  const videoUrl = PERSONA_VIDEOS[persona.id] ?? DEFAULT_INTRO_VIDEO
  const videoPosterUrl = persona.photoUrl

  return {
    displayName,
    firstName,
    bio,
    videoUrl,
    videoPosterUrl,
    videoDurationLabel: '~30 sec',
  }
}
