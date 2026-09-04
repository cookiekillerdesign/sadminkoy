/*
 * GDPR page - the built-in default.
 *
 * Same admin-editable setup as src/data/privacy.js: the live text can be
 * edited from the admin panel and is stored in the `site_texts` table under
 * key 'gdpr'. This file is the fallback (and the admin's "reset to default"
 * text) whenever that row is empty or Supabase is unreachable.
 *
 * This page collects, in one place, the GDPR-specific detail that the
 * Privacy Policy only summarises in its "Your rights" section - legal
 * basis per processing activity, the international-transfer story, and the
 * supervisory-authority contacts. It doesn't repeat what/why/how-long,
 * which stays the Privacy Policy's job.
 *
 * Format (same as privacy.js / cookiePolicy.js):
 *   - everything before the first "## " line is the intro paragraph
 *   - "## Title" starts a numbered section
 *   - blank line = new paragraph
 *   - **bold** and [label](url) inline
 */

export const GDPR_UPDATED = '2026-09-01';

export const GDPR_LABELS = {
  en: {
    metaTitle: "GDPR | Cookiekiller®",
    metaDesc: "How cookiekiller.design meets the EU General Data Protection Regulation - legal basis, your rights as a data subject, international transfers, and how to complain.",
    eyebrow: "Legal · GDPR",
    title: "GDPR",
    updatedLabel: "Last updated",
    controllerLabel: "Data controller",
    backHome: "Back home",
    contactCta: "Questions? Write me"
  },
  ru: {
    metaTitle: "GDPR | Cookiekiller®",
    metaDesc: "Как cookiekiller.design соблюдает европейский GDPR - правовые основания, ваши права как субъекта данных, международная передача данных и куда жаловаться.",
    eyebrow: "Юридическое · GDPR",
    title: "GDPR",
    updatedLabel: "Обновлено",
    controllerLabel: "Оператор данных",
    backHome: "На главную",
    contactCta: "Есть вопросы? Напишите"
  },
  ro: {
    metaTitle: "GDPR | Cookiekiller®",
    metaDesc: "Cum respectă cookiekiller.design regulamentul GDPR al UE - temeiul legal, drepturile tale ca persoană vizată, transferurile internaționale și unde poți depune o plângere.",
    eyebrow: "Legal · GDPR",
    title: "GDPR",
    updatedLabel: "Ultima actualizare",
    controllerLabel: "Operator de date",
    backHome: "Înapoi acasă",
    contactCta: "Întrebări? Scrie-mi"
  }
};

export const GDPR_DEFAULT = {
  en: `This page summarises, in one place, how this site meets the EU General Data Protection Regulation (GDPR) and the rights you have as a data subject. It's a companion to the [Privacy Policy](/privacy), which covers what's collected and why - this one focuses on legal basis, your rights, and where to complain.

## Data controller
**Mihail Barascov** (Cookiekiller®) is the sole data controller for this site, based in Chisinau, Republic of Moldova. There's no separate data protection officer - for anything data-related, write directly to [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).

## Legal basis for processing
Everything this site processes falls under one of two lawful bases in Art. 6(1) GDPR. **Contract / pre-contract steps** (Art. 6(1)(b)) - the name, email and message you submit through the lead-request form, used only to reply and discuss a project. **Legitimate interest** (Art. 6(1)(f)) - brief server logs (IP, browser, timestamp, page) kept by the hosting provider to keep the site secure and running, never used to identify you.

## Your rights as a data subject
**Access** - a copy of what's held about you. **Rectification** - correct anything inaccurate. **Erasure** - delete your data ("right to be forgotten"). **Restriction** - limit how it's processed. **Portability** - receive your data in a portable format. **Objection** - object to processing based on legitimate interest. All of these are free and answered within 30 days - email [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com) to use any of them.

## International transfers
Two processors sit outside the EU/EEA: **Vercel** (hosting, USA) and **Google** (the Gmail mailbox correspondence lands in). Both transfers rely on the EU-US Data Privacy Framework or Standard Contractual Clauses. **Supabase** stores only public portfolio content (projects, images, site text) and never personal data submitted through the form.

## Supervisory authority
If you believe your data has been mishandled and a direct request hasn't resolved it, you can lodge a complaint with Moldova's **National Center for Personal Data Protection (CNPDCP)** ([datepersonale.md](https://datepersonale.md)), or with your own country's data protection authority if you're in the EU/EEA ([edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en)).

## Related pages
See the [Privacy Policy](/privacy) for what's collected, kept how long and shared with whom, and the [Cookie Policy](/cookie-policy) for exactly what's stored in your browser (short answer: no cookies at all).
`,
  ru: `Эта страница в одном месте описывает, как сайт соблюдает европейский регламент GDPR и какие права есть у вас как у субъекта данных. Это дополнение к [Политике конфиденциальности](/privacy), которая описывает, что собирается и зачем, - здесь же основной фокус на правовых основаниях, ваших правах и том, куда жаловаться.

## Оператор данных
**Mihail Barascov** (Cookiekiller®) - единственный оператор персональных данных для этого сайта, находится в Кишинёве, Республика Молдова. Отдельного сотрудника по защите данных нет - по всем вопросам, связанным с данными, пишите напрямую на [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).

## Правовые основания обработки
Всё, что обрабатывает этот сайт, подпадает под одно из двух правовых оснований ст. 6(1) GDPR. **Исполнение договора / преддоговорные меры** (ст. 6(1)(b)) - имя, email и сообщение, отправленные через форму заявки, используются только для ответа и обсуждения проекта. **Законный интерес** (ст. 6(1)(f)) - короткие серверные логи (IP, браузер, время, страница), которые хранит хостинг-провайдер для безопасной работы сайта; для идентификации не используются.

## Ваши права как субъекта данных
**Доступ** - получить копию данных о вас. **Исправление** - исправить неточности. **Удаление** - удалить ваши данные ("право на забвение"). **Ограничение** - ограничить обработку. **Перенос** - получить данные в переносимом формате. **Возражение** - возразить против обработки на основании законного интереса. Всё это бесплатно и с ответом в течение 30 дней - пишите на [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com), чтобы воспользоваться любым из этих прав.

## Международная передача данных
Два обработчика находятся за пределами ЕС/ЕЭЗ: **Vercel** (хостинг, США) и **Google** (почтовый ящик Gmail, куда попадает переписка). Обе передачи опираются на EU-US Data Privacy Framework или Стандартные договорные условия. **Supabase** хранит только публичный контент портфолио (проекты, изображения, тексты сайта) и никогда - персональные данные, отправленные через форму.

## Надзорный орган
Если вы считаете, что ваши данные обработали неправильно, а прямой запрос не решил вопрос, можно подать жалобу в молдавский **Национальный центр по защите персональных данных (CNPDCP)** ([datepersonale.md](https://datepersonale.md)) или в надзорный орган своей страны, если вы находитесь в ЕС/ЕЭЗ ([edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en)).

## Смежные страницы
Смотрите [Политику конфиденциальности](/privacy) о том, что собирается, как долго хранится и с кем делится, и [Политику cookie](/cookie-policy) о том, что именно хранится в вашем браузере (короткий ответ: никаких cookies вообще).
`,
  ro: `Această pagină rezumă, într-un singur loc, cum respectă acest site Regulamentul GDPR al UE și ce drepturi ai ca persoană vizată. Este un însoțitor al [Politicii de confidențialitate](/privacy), care acoperă ce se colectează și de ce - aceasta se concentrează pe temeiul legal, drepturile tale și unde poți depune o plângere.

## Operator de date
**Mihail Barascov** (Cookiekiller®) este singurul operator de date pentru acest site, cu sediul în Chișinău, Republica Moldova. Nu există un responsabil separat cu protecția datelor - pentru orice ține de date, scrie direct la [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com).

## Temeiul legal al prelucrării
Tot ce prelucrează acest site se încadrează într-unul din cele două temeiuri legale de la art. 6(1) GDPR. **Executarea unui contract / măsuri precontractuale** (art. 6(1)(b)) - numele, e-mailul și mesajul trimise prin formularul de cerere, folosite doar pentru a răspunde și a discuta un proiect. **Interes legitim** (art. 6(1)(f)) - loguri de server scurte (IP, browser, oră, pagină) păstrate de furnizorul de găzduire pentru funcționarea sigură a site-ului, niciodată folosite pentru identificare.

## Drepturile tale ca persoană vizată
**Acces** - o copie a datelor deținute despre tine. **Rectificare** - corectarea a ceea ce este inexact. **Ștergere** - ștergerea datelor tale ("dreptul de a fi uitat"). **Restricționare** - limitarea modului de prelucrare. **Portabilitate** - primirea datelor într-un format portabil. **Opoziție** - opoziția față de prelucrarea bazată pe interes legitim. Toate acestea sunt gratuite și primesc răspuns în 30 de zile - scrie la [cookiekiller.design@gmail.com](mailto:cookiekiller.design@gmail.com) ca să folosești oricare dintre ele.

## Transferuri internaționale
Doi împuterniciți se află în afara UE/SEE: **Vercel** (găzduire, SUA) și **Google** (căsuța Gmail unde ajunge corespondența). Ambele transferuri se bazează pe EU-US Data Privacy Framework sau pe Clauzele Contractuale Standard. **Supabase** stochează doar conținutul public al portofoliului (proiecte, imagini, texte ale site-ului) și niciodată date personale trimise prin formular.

## Autoritatea de supraveghere
Dacă crezi că datele tale au fost gestionate greșit și o cerere directă nu a rezolvat problema, poți depune o plângere la **Centrul Național pentru Protecția Datelor cu Caracter Personal (CNPDCP)** din Moldova ([datepersonale.md](https://datepersonale.md)), sau la autoritatea de protecție a datelor din țara ta, dacă ești în UE/SEE ([edpb.europa.eu](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en)).

## Pagini conexe
Vezi [Politica de confidențialitate](/privacy) pentru ce se colectează, cât timp se păstrează și cu cine se împărtășește, și [Politica de cookie-uri](/cookie-policy) pentru ce se stochează exact în browserul tău (răspuns scurt: niciun cookie).
`
};
