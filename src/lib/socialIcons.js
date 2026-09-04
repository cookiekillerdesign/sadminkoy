import {
  BehanceLogo, LinkedinLogo, WhatsappLogo, TelegramLogo, TiktokLogo, PhoneCall,
  EnvelopeSimple, InstagramLogo, FacebookLogo, XLogo, YoutubeLogo, DiscordLogo,
  GithubLogo, DribbbleLogo, ThreadsLogo, LinkSimple
} from '@phosphor-icons/react';

/*
 * Registry of icons the footer's "ways to contact me" links can use - both
 * the admin panel's icon picker (admin → Контакты) and the public footer
 * (Home.jsx / SiteFooter.jsx) read from this single list, so adding an icon
 * here makes it available in both places at once.
 *
 * Keys are stored as-is in `social_links.icon` (see supabase/schema.sql). An
 * unknown/missing key (an old row from before an icon was removed here)
 * falls back to a generic link icon rather than crashing - see iconFor().
 */
export const SOCIAL_ICONS = {
  behance:  { Icon: BehanceLogo,   label: 'Behance' },
  linkedin: { Icon: LinkedinLogo,  label: 'LinkedIn' },
  whatsapp: { Icon: WhatsappLogo,  label: 'WhatsApp' },
  telegram: { Icon: TelegramLogo,  label: 'Telegram' },
  tiktok:   { Icon: TiktokLogo,    label: 'TikTok' },
  phone:    { Icon: PhoneCall,     label: 'Телефон' },
  email:    { Icon: EnvelopeSimple, label: 'Email' },
  instagram: { Icon: InstagramLogo, label: 'Instagram' },
  facebook: { Icon: FacebookLogo,  label: 'Facebook' },
  x:        { Icon: XLogo,         label: 'X (Twitter)' },
  youtube:  { Icon: YoutubeLogo,   label: 'YouTube' },
  discord:  { Icon: DiscordLogo,   label: 'Discord' },
  github:   { Icon: GithubLogo,    label: 'GitHub' },
  dribbble: { Icon: DribbbleLogo,  label: 'Dribbble' },
  threads:  { Icon: ThreadsLogo,   label: 'Threads' },
  link:     { Icon: LinkSimple,    label: 'Другое' }
};

export const SOCIAL_ICON_OPTIONS = Object.entries(SOCIAL_ICONS).map(([value, { label }]) => ({ value, label }));

/** Icon component for a stored key, falling back to the generic link icon
    for anything not (or no longer) in the registry above. */
export function iconFor(key) {
  return (SOCIAL_ICONS[key] || SOCIAL_ICONS.link).Icon;
}

/** tel:/mailto: links open in the same tab (there's nothing to "leave" to);
    everything else is treated as external, same as the old hardcoded
    Behance/LinkedIn anchors were. */
export function isExternalUrl(url) {
  return !/^(tel:|mailto:)/i.test(String(url || ''));
}
