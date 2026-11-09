import { useQuery } from '@tanstack/react-query';

import {
  parseAboutOverview,
  parseAmharicBook,
  parseCampusLifeImages,
  PUBLIC_CONTENT_KEYS,
  type AboutOverviewContent,
  type AmharicBookContent,
  type CampusLifeImages,
} from '@/lib/publicContent';
import { queryKeys } from '@/services/api/queryKeys';
import { getPublicSettings } from '@/services/settings/settingsService';

export type PublicSettingsMap = Record<string, string>;

export function usePublicSettings() {
  return useQuery({
    queryKey: queryKeys.settings.public,
    queryFn: ({ signal }) => getPublicSettings({ signal }),
    select: (response): PublicSettingsMap => response.data.settings,
    staleTime: 2 * 60_000,
  });
}

function pickSetting(settings: PublicSettingsMap | undefined, key: string): string | undefined {
  const value = settings?.[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/** Contact fields from public settings — only non-empty API values. */
export function usePublicContact() {
  const query = usePublicSettings();
  const settings = query.data;

  return {
    ...query,
    contact: {
      email: pickSetting(settings, 'contact.email'),
      phone: pickSetting(settings, 'contact.phone'),
      address: pickSetting(settings, 'contact.address'),
      admissionsEmail: pickSetting(settings, 'admissions.inquiryEmail'),
      admissionsPhone: pickSetting(settings, 'admissions.inquiryPhone'),
      admissionsInstructions: pickSetting(settings, 'admissions.instructions'),
    },
    social: {
      facebook: pickSetting(settings, 'social.facebook'),
      twitter: pickSetting(settings, 'social.twitter'),
      instagram: pickSetting(settings, 'social.instagram'),
      youtube: pickSetting(settings, 'social.youtube'),
    },
    identity: {
      name: pickSetting(settings, 'school.name'),
      tagline: pickSetting(settings, 'school.tagline'),
      description: pickSetting(settings, 'school.description'),
    },
    general: {
      footerText: pickSetting(settings, 'general.footerText'),
      copyright: pickSetting(settings, 'general.copyright'),
    },
  };
}

/** Amharic alphabet book payload from `website.amharicBook` (with local fallback). */
export function usePublicAmharicBook(): {
  book: AmharicBookContent;
  isLoading: boolean;
  isError: boolean;
} {
  const query = usePublicSettings();
  return {
    book: parseAmharicBook(pickSetting(query.data, PUBLIC_CONTENT_KEYS.amharicBook)),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** Campus life mosaic images from `website.campusLifeImages` (with local fallback). */
export function usePublicCampusLifeImages(): {
  images: CampusLifeImages;
  isLoading: boolean;
  isError: boolean;
} {
  const query = usePublicSettings();
  return {
    images: parseCampusLifeImages(pickSetting(query.data, PUBLIC_CONTENT_KEYS.campusLifeImages)),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** About overview from `website.aboutOverview` (with local fallback). */
export function usePublicAboutOverview(grades?: string): {
  overview: AboutOverviewContent;
  isLoading: boolean;
  isError: boolean;
} {
  const query = usePublicSettings();
  return {
    overview: parseAboutOverview(
      pickSetting(query.data, PUBLIC_CONTENT_KEYS.aboutOverview),
      grades,
    ),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
