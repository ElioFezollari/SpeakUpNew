/**
 * Clinic details that are the same in both languages.
 *
 * PLACEHOLDER: the phone number and email were supplied for layout only and
 * must be confirmed by the client before launch. See README.md.
 */
export const SITE = {
  name: 'Speak Up',
  /**
   * The clinic's registered name, as it appears on their Facebook page.
   * Typographic quotes rather than straight ones, to match the rest of the
   * copy and to avoid an HTML-escaped `&quot;` in the footer.
   */
  legalName: 'Klinikë Logopedie “Speak Up”',
  phone: {
    /** Formatted for reading. */
    display: '067 680 2760',
    /** E.164 for the tel: link. */
    href: 'tel:+355676802760',
  },
  /**
   * PLACEHOLDER: the client asked for Griselda's number to be shown alongside
   * the main one, but did not supply it. Fill in `display` and `href` and it
   * appears everywhere the phone is shown; leave `display` empty and it is
   * hidden entirely.
   */
  phone2: {
    label: 'Griselda Çela',
    display: '',
    href: '',
  },
  email: 'logopedispeakup@gmail.com',
  address: {
    /** Street only — every place that shows it adds `city` itself. */
    street: 'Rr. Kongresi i Manastirit',
    city: 'Tiranë',
    country: 'AL',
  },
} as const;

export type SocialKey = 'facebook' | 'instagram' | 'tiktok';

export interface Social {
  key: SocialKey;
  /** Used as the link's accessible name: "Speak Up on Facebook". */
  label: string;
  /** An empty URL hides the link entirely — nothing broken is ever rendered. */
  url: string;
}

/**
 * Social profiles. Only entries with a URL are rendered.
 *
 *   facebook  — confirmed, supplied by the client.
 *   tiktok    — found by search; the account is named Logopedi "Speak Up" and
 *               looks like the same clinic, but it is NOT confirmed. Verify it
 *               before launch, or blank the URL.
 *   instagram — confirmed, supplied by the client.
 */
export const SOCIALS: Social[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/klinikelogopediespeakup/',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/speakup_clinic/',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@logopedispeakup',
  },
];
