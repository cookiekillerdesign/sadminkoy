/*
 * Privacy Policy / GDPR text - the built-in default.
 *
 * The live text can be edited from the admin panel (Политика) and is stored in
 * the `site_texts` table, one row with key 'privacy' and a column per
 * language. Whatever is in the database wins; this file is the fallback when
 * the row is empty or Supabase is unreachable, and the text the admin's
 * "reset to default" button restores.
 *
 * Format (same in the admin textarea):
 *   - everything before the first "## " line is the intro paragraph
 *   - "## Title" starts a numbered section
 *   - blank line = new paragraph
 *   - **bold** and [label](url) inline
 *
 * Facts the default text relies on: mailto-only contact form, Vercel hosting,
 * Supabase content DB (anonymous reads), Gmail, no analytics, no cookies,
 * localStorage `cc_lang`, sessionStorage `cc_content_v3`.
 */

export const PRIVACY_UPDATED = '2026-09-01';

export const PRIVACY_CONTROLLER = {
  name: 'Mihail Barascov',
  brand: 'Cookiekiller®',
  email: 'cookiekiller.design@gmail.com',
  phone: '+373 69 555 534'
};

/* Page chrome - not editable from the admin, changes with the UI language. */
export const PRIVACY_LABELS = {
  en: {
    metaTitle: "Privacy Policy | Cookiekiller®",
    metaDesc: "What personal data cookiekiller.design collects, why, for how long, who processes it and your rights under GDPR and Moldovan law.",
    eyebrow: "Legal · GDPR",
    title: "Privacy Policy",
    updatedLabel: "Last updated",
    controllerLabel: "Data controller",
    backHome: "Back home",
    contactCta: "Questions? Write me"
  },
  ru: {
    metaTitle: "Политика конфиденциальности | Cookiekiller®",
    metaDesc: "Какие персональные данные собирает cookiekiller.design, зачем, сколько хранит, кто обрабатывает и какие у вас права по GDPR и законодательству Молдовы.",
    eyebrow: "Юридическое · GDPR",
    title: "Политика конфиденциальности",
    updatedLabel: "Обновлено",
    controllerLabel: "Оператор данных",
    backHome: "На главную",
    contactCta: "Есть вопросы? Напишите"
  },
  ro: {
    metaTitle: "Politica de confidențialitate | Cookiekiller®",
    metaDesc: "Ce date personale colectează cookiekiller.design, de ce, cât timp, cine le prelucrează și ce drepturi ai conform GDPR și legislației Republicii Moldova.",
    eyebrow: "Legal · GDPR",
    title: "Politica de confidențialitate",
    updatedLabel: "Ultima actualizare",
    controllerLabel: "Operator de date",
    backHome: "Înapoi acasă",
    contactCta: "Întrebări? Scrie-mi"
  }
};

/* Default policy text per language. */
export const PRIVACY_DEFAULT = {
  en: `No cookies, no analytics, nothing stored about you on a server. The only personal data I get is what you send me yourself, and I use it only to reply.

## Who
**Mihail Barascov** (Cookiekiller®), UX/UI designer, Chisinau, Republic of Moldova. Privacy questions: [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com), [+373 69 555 534](tel:+37369555534).

## What & why
**Name, email and your message** - from the contact form (it only opens your own email app; nothing is stored on the site), direct email or phone. Used to reply and discuss a project: Art. 6(1)(b) GDPR.
**Server logs** (IP, browser, time, page) - kept briefly by the hosting provider to run the site securely: Art. 6(1)(f). Never used to identify you.
The browser keeps two technical values, never sent anywhere: **cc_lang** (chosen language) and **cc_content_v3** (10-minute content cache). Not cookies, no consent needed.

## How long
Correspondence - up to 3 years after last contact. Contracts and invoices, if we work together - as long as Moldovan tax law requires. Server logs - up to 30 days.

## Who else
No selling or sharing. Processors under data processing agreements: **Vercel** (hosting, USA), **Supabase** (portfolio content only, anonymous reads), **Google** (Gmail mailbox). US transfers rely on the EU-US Data Privacy Framework or Standard Contractual Clauses. Behance and LinkedIn links lead to their own sites and policies.

## Your rights
Access, rectification, erasure, restriction, portability, objection - free, at any time, by emailing [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com); I answer within 30 days. Complaints: **CNPDCP** in Moldova ([datepersonale.md](https://datepersonale.md)) or your EU/EEA authority ([edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en)).

## Other
HTTPS only; the content database is read-only for visitors. The site is not directed at anyone under 16. If the site changes (analytics, a real form backend), this page is updated first with the date above.
`,
  ru: `Ни cookies, ни аналитики, ничего о вас не хранится на сервере. Единственные персональные данные, которые я получаю, - те, что вы присылаете сами, и использую я их только для ответа.

## Кто
**Mihail Barascov** (Михаил Барашков, Cookiekiller®), UX/UI-дизайнер, Кишинёв, Республика Молдова. По вопросам данных: [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com), [+373 69 555 534](tel:+37369555534).

## Что и зачем
**Имя, e-mail и текст сообщения** - из формы (она лишь открывает ваш почтовый клиент, на сайте ничего не сохраняется), письма или звонка. Нужны, чтобы ответить и обсудить проект: ст. 6(1)(b) GDPR.
**Серверные логи** (IP, браузер, время, страница) - недолго хранит хостинг-провайдер для безопасной работы сайта: ст. 6(1)(f). Для идентификации не используются.
В браузере остаются два технических значения, которые никуда не передаются: **cc_lang** (выбранный язык) и **cc_content_v3** (кэш контента на 10 минут). Это не cookies, согласие не требуется.

## Сколько
Переписка - до 3 лет после последнего контакта. Договоры и счета, если работаем вместе, - сколько требует налоговое законодательство Молдовы. Серверные логи - до 30 дней.

## Кто ещё
Не продаю и не передаю. Обработчики по соглашениям: **Vercel** (хостинг, США), **Supabase** (только контент портфолио, анонимное чтение), **Google** (почта Gmail). Передача в США - по EU-US Data Privacy Framework или Стандартным договорным условиям. Ссылки на Behance и LinkedIn ведут на их сайты с их политиками.

## Ваши права
Доступ, исправление, удаление, ограничение, перенос, возражение - бесплатно, в любое время, письмом на [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com); отвечаю в течение 30 дней. Жалобы: **CNPDCP** в Молдове ([datepersonale.md](https://datepersonale.md)) или надзорный орган вашей страны ЕС/ЕЭЗ ([edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en)).

## Прочее
Только HTTPS; база контента для посетителей доступна только на чтение. Сайт не предназначен для лиц младше 16 лет. Если сайт изменится (аналитика, настоящий бэкенд формы), эта страница обновится первой вместе с датой выше.
`,
  ro: `Fără cookies, fără analytics, nimic despre tine stocat pe server. Singurele date personale pe care le primesc sunt cele pe care mi le trimiți tu, și le folosesc doar ca să răspund.

## Cine
**Mihail Barascov** (Mihail Barașcov, Cookiekiller®), designer UX/UI, Chișinău, Republica Moldova. Întrebări despre date: [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com), [+373 69 555 534](tel:+37369555534).

## Ce și de ce
**Nume, e-mail și mesajul tău** - din formular (doar deschide aplicația ta de e-mail; nimic nu se salvează pe site), e-mail direct sau telefon. Folosite ca să răspund și să discutăm un proiect: art. 6(1)(b) GDPR.
**Loguri de server** (IP, browser, oră, pagină) - păstrate scurt de furnizorul de găzduire pentru funcționarea sigură a site-ului: art. 6(1)(f). Nu sunt folosite pentru identificare.
Browserul păstrează două valori tehnice, netrimise nicăieri: **cc_lang** (limba aleasă) și **cc_content_v3** (cache de conținut 10 minute). Nu sunt cookies, nu necesită consimțământ.

## Cât timp
Corespondența - până la 3 ani după ultimul contact. Contracte și facturi, dacă lucrăm împreună - cât cere legislația fiscală a Moldovei. Loguri de server - până la 30 de zile.

## Cine altcineva
Nu vând și nu împărtășesc. Persoane împuternicite, cu acorduri de prelucrare: **Vercel** (găzduire, SUA), **Supabase** (doar conținutul portofoliului, citire anonimă), **Google** (căsuța Gmail). Transferurile în SUA se bazează pe EU-US Data Privacy Framework sau Clauzele Contractuale Standard. Linkurile Behance și LinkedIn duc pe site-urile lor, cu politicile lor.

## Drepturile tale
Acces, rectificare, ștergere, restricționare, portabilitate, opoziție - gratuit, oricând, prin e-mail la [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com); răspund în 30 de zile. Plângeri: **CNPDCP** în Moldova ([datepersonale.md](https://datepersonale.md)) sau autoritatea din țara ta UE/SEE ([edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en)).

## Altele
Doar HTTPS; baza de conținut este doar-citire pentru vizitatori. Site-ul nu se adresează persoanelor sub 16 ani. Dacă site-ul se schimbă (analytics, un backend real pentru formular), această pagină se actualizează prima, cu data de mai sus.
`
};

/** "## Title" / paragraphs -> { intro, sections: [{ title, body: [] }] } */
export function parsePrivacy(text) {
  const intro = [];
  const sections = [];
  let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('## ')) { cur = { title: line.slice(3).trim(), body: [] }; sections.push(cur); continue; }
    if (!line) continue;
    (cur ? cur.body : intro).push(line);
  }
  return { intro: intro.join(' '), sections };
}
