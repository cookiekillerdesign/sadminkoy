/*
 * Static fallback content.
 *
 * The live site reads its certifications from Supabase (see
 * src/content/ContentProvider) once an admin has added them in
 * admin → Сертификаты. This list is what renders when Supabase isn't
 * configured yet, is unreachable, or the table is still empty — so the
 * section never shows blank, and the same 5 credentials that shipped with
 * the site are pre-seeded into the database too (see supabase/schema.sql).
 */
export const STATIC_CERTIFICATIONS = [
  {
    id: 'static-acp-visual-design',
    name: 'Adobe Certified Professional - Visual Design',
    issuer: 'Adobe',
    dateLabel: 'Oct 2020',
    code: 'FBAF-XM7X',
    verifyUrl: 'https://verify.certiport.com',
    img: '/certs/adobe-visual-design.png'
  },
  {
    id: 'static-acp-photoshop',
    name: 'ACP - Visual Design · Photoshop CC',
    issuer: 'Adobe',
    dateLabel: 'Oct 2020',
    code: 'JULU-4TWS',
    verifyUrl: 'https://verify.certiport.com',
    img: '/certs/adobe-photoshop.png'
  },
  {
    id: 'static-acp-illustrator',
    name: 'ACP - Graphic Design · Illustrator',
    issuer: 'Adobe',
    dateLabel: 'Apr 2021',
    code: 'FBAE-XMcd',
    verifyUrl: 'https://verify.certiport.com',
    img: '/certs/adobe-illustrator.png'
  },
  {
    id: 'static-acp-indesign',
    name: 'ACP - Print & Digital Media · InDesign',
    issuer: 'Adobe',
    dateLabel: 'Feb 2022',
    code: 'ysmR-Dw74',
    verifyUrl: 'https://verify.certiport.com',
    img: '/certs/adobe-indesign.png'
  },
  {
    id: 'static-ibm-basic-principles',
    name: 'Basic Principles of Design',
    issuer: 'IBM SkillsBuild',
    dateLabel: 'Feb 2026',
    code: '',
    verifyUrl: 'https://www.credly.com/badges/214197fc-20cd-4d2c-9ffd-403001a31b82',
    img: '/certs/ibm-basic-principles.png'
  }
];
