/*
 * Cookie Policy - the built-in default.
 *
 * Same admin-editable setup as src/data/privacy.js: the live text can be
 * edited from the admin panel and is stored in the `site_texts` table under
 * key 'cookies'. This file is the fallback (and the admin's "reset to
 * default" text) whenever that row is empty or Supabase is unreachable.
 *
 * Format (same as privacy.js / gdpr.js):
 *   - everything before the first "## " line is the intro paragraph
 *   - "## Title" starts a numbered section
 *   - blank line = new paragraph
 *   - **bold** and [label](url) inline
 *
 * Facts this text relies on (see also src/data/privacy.js): no analytics or
 * advertising cookies are set by this site - the only two values a browser
 * keeps are cc_lang (localStorage) and cc_content_v3 (sessionStorage).
 */

export const COOKIES_UPDATED = '2026-09-01';

export const COOKIES_LABELS = {
  en: {
    metaTitle: "Cookie Policy | Cookiekiller®",
    metaDesc: "This site sets no cookies. What it stores in your browser instead, why, and for how long.",
    eyebrow: "Legal · Cookies",
    title: "Cookie Policy",
    updatedLabel: "Last updated",
    controllerLabel: "Data controller",
    backHome: "Back home",
    contactCta: "Questions? Write me"
  },
  ru: {
    metaTitle: "Политика использования cookie | Cookiekiller®",
    metaDesc: "Этот сайт не использует cookies. Что вместо этого хранится в вашем браузере, зачем и как долго.",
    eyebrow: "Юридическое · Cookies",
    title: "Политика cookie",
    updatedLabel: "Обновлено",
    controllerLabel: "Оператор данных",
    backHome: "На главную",
    contactCta: "Есть вопросы? Напишите"
  },
  ro: {
    metaTitle: "Politica de cookie-uri | Cookiekiller®",
    metaDesc: "Acest site nu folosește cookie-uri. Ce se stochează în schimb în browserul tău, de ce și cât timp.",
    eyebrow: "Legal · Cookies",
    title: "Politica de cookie-uri",
    updatedLabel: "Ultima actualizare",
    controllerLabel: "Operator de date",
    backHome: "Înapoi acasă",
    contactCta: "Întrebări? Scrie-mi"
  }
};

export const COOKIES_DEFAULT = {
  en: `Short version: this site sets no cookies. No analytics, no advertising, no consent banner - because there's nothing here that needs your consent.

## What this site doesn't do
No tracking or advertising cookies, no analytics scripts, no cross-site tracking, no fingerprinting. Nothing about your visit is stored on a server anywhere.

## What your browser stores instead
Two small technical values, kept only on your own device and never sent anywhere: **cc_lang** - the interface language you picked (English, Russian or Romanian), kept in **localStorage** until you clear it or change it again. **cc_content_v3** - a 10-minute cache of the portfolio content (project list, images, text) so repeat visits load instantly, kept in **sessionStorage** and cleared automatically the moment you close the tab. Neither is a cookie in the legal sense, neither identifies you, and under the ePrivacy Directive neither needs a consent banner - both are strictly functional and never leave your browser.

## Third-party links
The **Behance** and **LinkedIn** links in the footer and menu open their own sites in a new tab, which may set their own cookies under their own policies - this site has no say over that once you click through.

## Hosting & content
**Vercel** (hosting) and **Supabase** (the portfolio's content database, read-only for visitors) may log basic request data - IP address, browser, timestamp - briefly, to keep the site secure and running. That's covered in the [Privacy Policy](/privacy), not by cookies, since it isn't stored in your browser at all.

## If that ever changes
If real analytics or advertising cookies are ever added to this site, this page - and an actual consent banner - will appear first, with the date below updated to match.

## Questions
Email [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com) any time.
`,
  ru: `Коротко: этот сайт не использует cookies. Нет аналитики, нет рекламы, нет баннера согласия - потому что здесь нечего согласовывать.

## Чего здесь нет
Никаких трекинговых или рекламных cookies, аналитических скриптов, межсайтового отслеживания или fingerprinting. О вашем визите ничего не сохраняется ни на каком сервере.

## Что вместо этого хранит браузер
Два небольших технических значения, которые остаются только на вашем устройстве и никуда не передаются: **cc_lang** - выбранный язык интерфейса (английский, русский или румынский), хранится в **localStorage**, пока вы его не очистите или не смените снова. **cc_content_v3** - кэш контента портфолио на 10 минут (список проектов, изображения, тексты), чтобы повторные визиты грузились мгновенно, хранится в **sessionStorage** и удаляется автоматически при закрытии вкладки. Ни то, ни другое не является cookie в юридическом смысле, не идентифицирует вас лично и, согласно ePrivacy Directive, не требует баннера согласия - оба значения строго функциональны и никогда не покидают ваш браузер.

## Ссылки на сторонние сайты
Ссылки на **Behance** и **LinkedIn** в футере и меню открывают их собственные сайты в новой вкладке, которые могут устанавливать свои cookies по своим политикам - после перехода этот сайт на это никак не влияет.

## Хостинг и контент
**Vercel** (хостинг) и **Supabase** (база контента портфолио, доступна посетителям только для чтения) могут недолго хранить базовые данные запроса - IP-адрес, браузер, время - для безопасной работы сайта. Это описано в [Политике конфиденциальности](/privacy), а не в cookies, так как в браузере это никак не сохраняется.

## Если это изменится
Если на сайте когда-либо появятся настоящие аналитические или рекламные cookies, эта страница - и настоящий баннер согласия - появятся первыми, а дата ниже обновится.

## Вопросы
Пишите в любое время на [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).
`,
  ro: `Pe scurt: acest site nu folosește cookie-uri. Fără analytics, fără publicitate, fără banner de consimțământ - pentru că nu există nimic aici care să necesite consimțământul tău.

## Ce nu face acest site
Fără cookie-uri de tracking sau publicitate, fără scripturi de analytics, fără urmărire cross-site, fără fingerprinting. Nimic despre vizita ta nu este stocat pe vreun server.

## Ce stochează browserul tău în schimb
Două valori tehnice mici, păstrate doar pe dispozitivul tău și netrimise nicăieri: **cc_lang** - limba de interfață aleasă (engleză, rusă sau română), păstrată în **localStorage** până o ștergi sau o schimbi din nou. **cc_content_v3** - un cache de 10 minute al conținutului portofoliului (lista de proiecte, imagini, texte), ca vizitele repetate să se încarce instant, păstrat în **sessionStorage** și șters automat când închizi tab-ul. Niciuna nu este cookie în sens legal, niciuna nu te identifică, iar conform Directivei ePrivacy niciuna nu necesită banner de consimțământ - ambele sunt strict funcționale și nu părăsesc niciodată browserul tău.

## Linkuri către terți
Linkurile către **Behance** și **LinkedIn** din footer și meniu deschid propriile lor site-uri într-un tab nou, care își pot seta propriile cookie-uri conform propriilor politici - odată ce dai click, acest site nu mai are niciun control asupra asta.

## Găzduire și conținut
**Vercel** (găzduire) și **Supabase** (baza de conținut a portofoliului, doar-citire pentru vizitatori) pot păstra scurt date de bază despre cerere - adresă IP, browser, oră - pentru funcționarea sigură a site-ului. Asta e descris în [Politica de confidențialitate](/privacy), nu prin cookie-uri, pentru că nu se stochează deloc în browserul tău.

## Dacă asta se schimbă vreodată
Dacă vreodată se adaugă pe acest site cookie-uri reale de analytics sau publicitate, această pagină - și un banner de consimțământ real - vor apărea primele, cu data de mai jos actualizată.

## Întrebări
Scrie oricând la [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).
`
};
