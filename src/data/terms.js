/*
 * Terms of Use - the built-in default.
 *
 * Same admin-editable setup as src/data/privacy.js: the live text can be
 * edited from the admin panel (Legals → Terms of Use) and is stored in the
 * `site_texts` table under key 'terms'. This file is the fallback (and the
 * admin's "reset to default" text) whenever that row is empty or Supabase
 * is unreachable.
 *
 * Format (same as privacy.js / gdpr.js / cookiePolicy.js):
 *   - everything before the first "## " line is the intro paragraph
 *   - "## Title" starts a numbered section
 *   - blank line = new paragraph
 *   - **bold** and [label](url) inline
 */

export const TERMS_UPDATED = '2026-09-03';

export const TERMS_LABELS = {
  en: {
    metaTitle: "Terms of Use | Cookiekiller®",
    metaDesc: "The rules for using cookiekiller.design - intellectual property, acceptable use, disclaimers and governing law.",
    eyebrow: "Legal · Terms",
    title: "Terms of Use",
    updatedLabel: "Last updated",
    controllerLabel: "Site owner",
    backHome: "Back home",
    contactCta: "Questions? Write me"
  },
  ru: {
    metaTitle: "Условия использования | Cookiekiller®",
    metaDesc: "Правила использования cookiekiller.design - интеллектуальная собственность, допустимое использование, отказ от ответственности и применимое право.",
    eyebrow: "Юридическое · Условия",
    title: "Условия использования",
    updatedLabel: "Обновлено",
    controllerLabel: "Владелец сайта",
    backHome: "На главную",
    contactCta: "Есть вопросы? Напишите"
  },
  ro: {
    metaTitle: "Termeni de utilizare | Cookiekiller®",
    metaDesc: "Regulile de utilizare a cookiekiller.design - proprietate intelectuală, utilizare acceptabilă, declinări de responsabilitate și legea aplicabilă.",
    eyebrow: "Legal · Termeni",
    title: "Termeni de utilizare",
    updatedLabel: "Ultima actualizare",
    controllerLabel: "Proprietarul site-ului",
    backHome: "Înapoi acasă",
    contactCta: "Întrebări? Scrie-mi"
  }
};

export const TERMS_DEFAULT = {
  en: `By opening or using this site you agree to these terms. If you don't agree with any of them, simply don't use the site - nothing here creates an account, a subscription or any obligation to come back.

## What this site is
cookiekiller.design is the personal portfolio of **Mihail Barascov** (Cookiekiller®), a product designer based in Chisinau, Republic of Moldova. It presents design work, case studies and a way to get in touch. It is an informational site - nothing on it is a binding offer; any actual work is agreed separately, in writing.

## Intellectual property
All content on this site - case studies, texts, images, illustrations, the visual identity and the Cookiekiller® mark - belongs to Mihail Barascov or is used with permission of the respective clients. You may view and share links to it freely. You may not copy, republish, sell or present any of it as your own work without prior written consent. Client work shown in the portfolio remains subject to those clients' own rights.

## Acceptable use
Use the site as a normal visitor. Don't attempt to break, overload, scrape at scale or reverse-engineer it, don't probe the content database or the admin area, and don't use the contact form to send spam, malware or unlawful content.

## Third-party links
Pages here link to external services (Behance, LinkedIn, client sites and others). Those sites have their own terms and privacy practices - following a link means you're subject to theirs, not these.

## No warranties
The site is provided "as is". Case-study metrics reflect specific projects at a specific time and are not a promise of similar results. Content may change, move or disappear without notice, and availability is not guaranteed.

## Limitation of liability
To the maximum extent permitted by law, the site owner is not liable for any indirect or consequential loss arising from using (or being unable to use) this site. Nothing in these terms limits liability that cannot be limited under applicable law.

## Privacy
Personal data is covered separately - see the [Privacy Policy](/privacy), the [GDPR page](/gdpr) and the [Cookie Policy](/cookie-policy) (short version: the site sets no cookies).

## Governing law
These terms are governed by the laws of the **Republic of Moldova**. Any dispute that can't be resolved by simply writing to each other first goes to the competent courts of Chisinau.

## Changes
These terms may be updated as the site evolves; the date above always reflects the current version. Continued use of the site after an update means acceptance of the updated terms.

## Contact
Anything unclear - write to [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).
`,
  ru: `Открывая или используя этот сайт, вы соглашаетесь с этими условиями. Если какое-то из них вам не подходит - просто не пользуйтесь сайтом: здесь нет ни аккаунтов, ни подписок, ни каких-либо обязательств возвращаться.

## Что это за сайт
cookiekiller.design - личное портфолио **Михаила Барашкова** (Cookiekiller®), продуктового дизайнера из Кишинёва, Республика Молдова. Здесь представлены работы, кейсы и способ связаться. Это информационный сайт: ничто на нём не является публичной офертой, любая реальная работа согласуется отдельно и письменно.

## Интеллектуальная собственность
Весь контент сайта - кейсы, тексты, изображения, иллюстрации, визуальный стиль и знак Cookiekiller® - принадлежит Михаилу Барашкову или используется с разрешения соответствующих клиентов. Смотреть и делиться ссылками можно свободно. Копировать, публиковать, продавать или выдавать что-либо за свою работу без предварительного письменного согласия нельзя. Клиентские работы в портфолио остаются под правами этих клиентов.

## Допустимое использование
Пользуйтесь сайтом как обычный посетитель. Не пытайтесь ломать, перегружать, массово выкачивать или реверс-инжинирить его, не лезьте в базу контента и админ-панель, не используйте форму связи для спама, вредоносного или незаконного контента.

## Ссылки на сторонние ресурсы
Страницы сайта ссылаются на внешние сервисы (Behance, LinkedIn, сайты клиентов и другие). У них свои условия и свои практики обработки данных - переходя по ссылке, вы подчиняетесь их правилам, а не этим.

## Отсутствие гарантий
Сайт предоставляется «как есть». Метрики в кейсах отражают конкретные проекты в конкретный момент и не обещают похожих результатов. Контент может меняться, переезжать или исчезать без уведомления, доступность сайта не гарантируется.

## Ограничение ответственности
В максимально допустимой законом степени владелец сайта не отвечает за косвенные убытки, возникшие из-за использования (или невозможности использования) сайта. Ничто в этих условиях не ограничивает ответственность, которую нельзя ограничить по применимому праву.

## Персональные данные
Персональные данные регулируются отдельно - см. [Политику конфиденциальности](/privacy), [страницу GDPR](/gdpr) и [Политику cookie](/cookie-policy) (короткая версия: сайт не использует cookies).

## Применимое право
Эти условия регулируются законодательством **Республики Молдова**. Любой спор, который не удалось решить простой перепиской, рассматривается компетентными судами Кишинёва.

## Изменения
Условия могут обновляться по мере развития сайта; дата выше всегда отражает актуальную версию. Продолжение использования сайта после обновления означает согласие с новой редакцией.

## Контакт
Если что-то непонятно - пишите на [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).
`,
  ro: `Deschizând sau folosind acest site, ești de acord cu acești termeni. Dacă vreunul dintre ei nu îți convine - pur și simplu nu folosi site-ul: aici nu există conturi, abonamente sau vreo obligație de a reveni.

## Ce este acest site
cookiekiller.design este portofoliul personal al lui **Mihail Barascov** (Cookiekiller®), product designer din Chișinău, Republica Moldova. Prezintă lucrări, studii de caz și o modalitate de contact. Este un site informativ - nimic de aici nu constituie o ofertă obligatorie; orice colaborare reală se convine separat, în scris.

## Proprietate intelectuală
Tot conținutul site-ului - studii de caz, texte, imagini, ilustrații, identitatea vizuală și marca Cookiekiller® - aparține lui Mihail Barascov sau este folosit cu permisiunea clienților respectivi. Poți vizualiza și distribui linkuri liber. Nu poți copia, republica, vinde sau prezenta nimic drept lucrarea ta fără acord scris prealabil. Lucrările clienților din portofoliu rămân sub drepturile acelor clienți.

## Utilizare acceptabilă
Folosește site-ul ca un vizitator obișnuit. Nu încerca să-l spargi, să-l supraîncarci, să extragi conținut în masă sau să-l supui ingineriei inverse, nu sonda baza de conținut sau zona de administrare și nu folosi formularul de contact pentru spam, malware sau conținut ilegal.

## Linkuri către terți
Paginile site-ului trimit către servicii externe (Behance, LinkedIn, site-urile clienților și altele). Acele site-uri au propriii termeni și propriile practici de confidențialitate - urmând un link, te supui regulilor lor, nu acestora.

## Fără garanții
Site-ul este oferit „ca atare". Metricile din studiile de caz reflectă proiecte concrete la un moment concret și nu promit rezultate similare. Conținutul se poate schimba, muta sau dispărea fără notificare, iar disponibilitatea site-ului nu este garantată.

## Limitarea răspunderii
În măsura maximă permisă de lege, proprietarul site-ului nu răspunde pentru pierderi indirecte sau consecvente apărute din folosirea (sau imposibilitatea folosirii) acestui site. Nimic din acești termeni nu limitează răspunderea care nu poate fi limitată conform legii aplicabile.

## Date personale
Datele personale sunt reglementate separat - vezi [Politica de confidențialitate](/privacy), [pagina GDPR](/gdpr) și [Politica de cookie-uri](/cookie-policy) (pe scurt: site-ul nu folosește cookie-uri).

## Legea aplicabilă
Acești termeni sunt guvernați de legislația **Republicii Moldova**. Orice litigiu care nu poate fi rezolvat printr-o simplă corespondență este de competența instanțelor din Chișinău.

## Modificări
Termenii pot fi actualizați pe măsură ce site-ul evoluează; data de mai sus reflectă întotdeauna versiunea curentă. Continuarea folosirii site-ului după o actualizare înseamnă acceptarea noii versiuni.

## Contact
Dacă ceva e neclar - scrie la [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).
`
};
