import { PUBLIC_ROUTES } from '@/config/routes';

export interface NavChild {
  /** i18n key under `nav.*` */
  labelKey: string;
  path: string;
}

export interface NavItem {
  /** i18n key under `nav.*` */
  labelKey: string;
  path: string;
  end?: boolean;
  children?: readonly NavChild[];
}

/**
 * Public main navigation — school site chrome (no Login / Register / Pricing).
 * Wired to real pages / CMS backends where available.
 */
export const MAIN_NAV: readonly NavItem[] = [
  { labelKey: 'home', path: PUBLIC_ROUTES.home, end: true },
  {
    labelKey: 'about',
    path: PUBLIC_ROUTES.about,
    children: [
      { labelKey: 'aboutOverview', path: `${PUBLIC_ROUTES.about}#overview` },
      { labelKey: 'aboutStory', path: `${PUBLIC_ROUTES.about}#story` },
      { labelKey: 'aboutMission', path: `${PUBLIC_ROUTES.about}#mission-vision` },
      { labelKey: 'aboutCampus', path: `${PUBLIC_ROUTES.about}#campus-life` },
    ],
  },
  {
    labelKey: 'academics',
    path: PUBLIC_ROUTES.academics,
    children: [
      { labelKey: 'academicsOverview', path: `${PUBLIC_ROUTES.academics}#overview` },
      { labelKey: 'academicsSubjects', path: `${PUBLIC_ROUTES.academics}#programs` },
      { labelKey: 'academicsWhy', path: `${PUBLIC_ROUTES.academics}#apply` },
    ],
  },
  { labelKey: 'admission', path: PUBLIC_ROUTES.admission },
  { labelKey: 'events', path: PUBLIC_ROUTES.events },
  { labelKey: 'news', path: PUBLIC_ROUTES.news },
  { labelKey: 'contact', path: PUBLIC_ROUTES.contact },
] as const;
