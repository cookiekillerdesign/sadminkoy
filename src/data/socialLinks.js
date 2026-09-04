/*
 * Static fallback content.
 *
 * The live site reads its footer contact links from Supabase (see
 * src/content/ContentProvider) once an admin has edited them in
 * admin → Контакты. This list is what renders when Supabase isn't
 * configured yet, is unreachable, or the table is still empty — so the
 * footer never shows blank, and the same links that shipped with the site
 * are pre-seeded into the database too (see supabase/schema.sql).
 */
export const STATIC_SOCIAL_LINKS = [
  { id: 'static-behance',  icon: 'behance',  label: 'Behance',  url: 'https://behance.net/iamcookiekiller' },
  { id: 'static-linkedin', icon: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/in/iamcookiekiller' },
  { id: 'static-whatsapp', icon: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/37369555534' },
  { id: 'static-phone',    icon: 'phone',    label: '+373 69 555 534', url: 'tel:+37369555534' }
];
