# Pago Home & Family (prototip hackathon)

## 1. Produsul

Aplicația Pago pentru familie: toate plățile casei într-un singur loc (facturi, abonamente, RCA, rovinietă, ITP, PAD, taxe locale, reîncărcări). Scopul: utilizatorii plătesc direct din aplicație. Prototip cu date simulate. Are backend propriu (conturi, bază de date, API), dar nu are procesator de plăți real și nici legătură reală cu furnizorii.

## 2. Ecrane

Meniul de jos: **Acasă**, **Facturi**, **Abonamente**, **Asigurări**. Nu se adaugă alte butoane în meniu.

Bara de sus: iconița de profil din stânga deschide fereastra de sticlă închisă cu profilurile pe orizontală, „Adaugă profil” la final și legătura „Contul meu și setări”. Clopoțelul din dreapta deschide notificările și arată câte sunt necitite.

- **Acasă** (`/`): bannerul de alertă, scurtăturile (Istoric, Plăți automate, Alte plăți, Familie), calendarul lunii cu iconițe pe categorii și totalul scris mic sub lună, reminderele (Plătește, Am plătit deja, Amână), lista „De plătit în lună” cu „Plătește tot”, fereastra zilei. Calendarul rămâne elementul principal al paginii: celule pătrate, spații mici, fără alt layout în locul lui.
- **Facturi** (`/facturi`, `/facturi/[id]`, `/facturi/furnizori`): lista facturilor cu starea conexiunii și a plății, facturi întârziate, plata, chitanța, istoricul pe 12 luni, autocitirea indexului, plata automată, împărțirea cu familia, contestarea (Flux A cu index manual, Flux B cu un tap), urmărirea sesizării și descărcarea ei ca PDF. Din „Furnizori” conectezi, reconectezi sau elimini un furnizor.
- **Abonamente** (`/abonamente`, `/abonamente/[id]`, `/abonamente/nou`): lunare, trimestriale și anuale. Adăugare din lista de servicii cunoscute sau manual, editare, pauză, anulare, reactivare, ștergere. Avertizări pentru trial care se termină, scumpire și abonament nefolosit.
- **Asigurări** (`/asigurari`, `/asigurari/[id]`, `/asigurari/nou`): RCA, rovinietă, ITP și PAD, grupate pe mașină sau locuință, cu zilele rămase. Reînnoirea se face din aplicație, cu oferte de comparat.
- **Statistici** (`/statistici`): an sau categorie, radar pe luni, inel pe categorii, plata anuală, costul mediu lunar, bugetul lunar și observații.
- **Istoric** (`/istoric`): toate plățile, cu căutare, filtre (perioadă, categorie, stare), chitanță (se descarcă drept PDF) și export CSV.
- **Notificări** (`/notificari`): tot ce cere atenție, calculat din date (scadențe, plăți eșuate, furnizori deconectați, scumpiri, documente care expiră, buget depășit).
- **Profil** (`/profil`): cardurile (`/profil/carduri`), plățile automate (`/profil/plati-automate`), setările (`/profil/setari`: praguri de remindere, canale, buget, blocarea aplicației), punctele și „Resetează demo”.
- **Familie** (`/familie`): membrii, invitațiile, cheltuielile împărțite și misiunile cu puncte.
- **Alte plăți** (`/servicii`): reîncărcare cartelă, rovinietă, taxă de pod, taxe și impozite locale.
- **Ajutor** (`/ajutor`): întrebări frecvente și tichete de suport cu răspuns în aplicație.
- **Cont** (ecranul de la pornire): intrare în cont, cont nou sau „Încearcă fără cont”. Din Profil: schimbarea parolei, ieșirea din cont, ștergerea contului.
- **Primii pași**: trei ecrane de prezentare la prima deschidere, apoi stări goale care explică ce urmează.

Categorii și culori: **Facturi** albastru, **Asigurări** verde (mașinile și locuința), **Abonamente** roșu, **Alte plăți** chihlimbar.

## 3. Date și logică

- `src/types/pago.ts`: tipurile comune. Modificările se anunță înainte.
- `src/data/mockFamilyData.ts`: datele simulate (profiluri, facturi, abonamente, expirări, furnizori, carduri, plăți automate, membri, misiuni).
- `src/data/catalog.ts`: cataloagele (furnizori, servicii de abonament, oferte de reînnoire, taxe, operatori, întrebări frecvente).
- `src/context/appState.ts`: forma stării și starea inițială. Cheia din `localStorage` este `pago-home-family:v2`.
- `src/context/actions.ts`: toate schimbările de stare, ca funcții pure (plată, contestație, abonamente, asigurări, carduri, plăți automate, familie). Aici se adaugă orice acțiune nouă, cu test în `actions.test.ts`.
- `src/context/commands.ts`: lista comenzilor (acțiunile pe care le poate cere aplicația) și pașii automați. Este folosită și de aplicație, și de server.
- `src/context/store.ts`: stocul extern, citit cu `useSyncExternalStore`. Cu cont, trimite fiecare comandă la server și preia starea de acolo. Fără cont, salvează în `localStorage`.
- `src/context/session.ts`: starea contului (se încarcă, vizitator, fără cont, cu cont).
- `src/context/FamilyContext.tsx`: `FamilyProvider` și `useFamily()`. Fără cont, pornește cronometrele care avansează plățile, sincronizarea și tichetele. Cu cont, serverul face acești pași, iar aplicația îi citește periodic. Ține starea de interfață (fereastra de plată, mesajele scurte).
- `src/lib/payments.ts`: `buildEvents` construiește calendarul din facturi, abonamente, expirări și plăți. `eventState` decide ce acțiune are fiecare plată.
- `src/lib/reminders.ts`, `src/lib/notifications.ts`: reminderele pe praguri și notificările.
- `src/lib/subscriptions.ts`, `src/lib/expiry.ts`, `src/lib/autopay.ts`, `src/lib/checkout.ts`, `src/lib/history.ts`, `src/lib/insights.ts`: calculele pe fiecare zonă.
- `src/lib/format.ts`: date, plurale, `demoNow()` și `uniqueId()`.
- `src/lib/disputes.ts`: validarea indexului, sume, zile rămase (`DEMO_TODAY = 2026-11-16`).

Data demo este fixă (`DEMO_TODAY`). Toate calculele pornesc de la ea, nu de la data reală.

## 4. Plata

Toate plățile trec prin `CheckoutSheet`, deschis cu `openCheckout(items)`. Pașii: **în procesare**, **trimisă la furnizor**, **confirmată** sau **eșuată**. Fiecare plată are chitanță cu număr de referință și numele care apare pe extras (`PAGO*...`).

- Comision Pago: 0 RON, afișat în sumar.
- Plata eșuează dacă furnizorul este deconectat sau cardul este expirat. Din ecranul de rezultat se poate reconecta furnizorul și reîncerca.
- Puncte: 1 punct la fiecare 10 RON plătiți. 100 de puncte fac 1 RON, cel mult 20% dintr-o plată.
- Plata automată cere acord separat, are limită de siguranță, anunț cu câteva zile înainte și jurnal. Peste limită nu se plătește singură, cere confirmare.
- O factură contestată se plătește doar pentru suma corectă. Restul rămâne înghețat până la răspunsul furnizorului.
- Formularul de card este demonstrativ: păstrează doar ultimele patru cifre. Nu se introduc datele unui card real.

Totul este simulat: plata avansează singură după câteva secunde.

## 5. Documente PDF

Chitanța oricărei plăți și sesizarea unei facturi contestate se descarcă drept PDF, generat în browser, fără server.

- `src/lib/documents.ts`: conținutul documentelor (`receiptDocument`, `disputeDocument`), ca date simple, fără legătură cu PDF-ul. Aici se schimbă textele și rândurile. Chitanța are aceeași structură pentru facturi, abonamente, asigurări și plăți rapide, doar rândurile din „Detalii plată” diferă.
- `src/lib/pdf/`: desenarea. `canvas.ts` are piesele comune (antet, carduri, grilă, tabel, note, subsol, trecerea pe pagina următoare), `receipt.ts` și `dispute.ts` așază fiecare document, `theme.ts` are culorile (copiate din tokenii din `globals.css`, singurul loc cu culori hex în afara lui), `index.ts` încarcă fonturile.
- `src/components/shared/useDocumentDownload.ts`: legătura cu ecranele. Butoanele sunt în `ReceiptSheet` („Descarcă PDF”) și în `DisputeDownload` („Descarcă sesizarea (PDF)”).
- `public/fonts/`: fontul Inter redus la literele latine și românești, cu licența lui (`Inter-LICENSE.txt`). Biblioteca `pdf-lib` se încarcă doar la apăsarea butonului.

Reguli:

- Nu folosiți `subset: true` la `embedFont`. Micșorarea făcută de `pdf-lib` strică literele. Fontul este deja redus.
- Orice text trece prin `Canvas.text`, care scoate caracterele pe care fontul nu le are (de exemplu emoji).
- Fiecare document trebuie să încapă pe o pagină în cazurile obișnuite. Verificați vizual după orice schimbare de așezare.
- Documentele spun clar că sunt demonstrative. Nu scoateți această mențiune.

Pentru a vedea documentele fără să porniți aplicația, testele le pot scrie într-un folder:

```bash
PAGO_PDF_OUT=pdf-probe npm test
```

În PowerShell: `$env:PAGO_PDF_OUT="pdf-probe"; npm test`. Folderul `pdf-probe/` este ignorat de git.

## 6. Backend

Rulează în aceeași aplicație Next.js, fără servicii externe și fără pachete noi.

- `src/server/db.ts`: baza de date SQLite (`node:sqlite`, inclus în Node 24). Fișierul este `data/pago.db`, ignorat de git. Altă cale se dă prin `PAGO_DB_PATH`.
- `src/server/auth.ts`: conturi și sesiuni. Parola este păstrată ca hash `scrypt` cu sare. Sesiunea este un cookie `HttpOnly`, valabil 30 de zile, păstrat în baza de date doar ca hash.
- `src/server/validate.ts`: verifică fiecare cerere câmp cu câmp și păstrează doar câmpurile cunoscute.
- `src/server/stateRepo.ts`: starea fiecărui cont, cu număr de revizie. Aplică o comandă cu aceleași funcții din `actions.ts`, refuză sumele care nu corespund și identificatorii dubli, ține jurnalul de activitate și registrul plăților. Tot aici rulează pașii automați (plata avansează, sincronizarea, stornarea, plata automată).
- `src/server/http.ts`: răspunsuri, cookie, verificarea originii cererii și limita de încercări.

Rute (`src/app/api/`):

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `PATCH /api/account` (parolă nouă), `DELETE /api/account` (șterge contul)
- `GET /api/state` (starea contului), `DELETE /api/state` (revine la datele inițiale)
- `POST /api/commands` cu `{ type, args }`: singura cale de a schimba starea
- `GET /api/export` (toate datele contului), `GET /api/health`

O acțiune nouă se adaugă în patru locuri: funcția din `actions.ts`, comanda din `commands.ts`, validatorul din `validate.ts` și, dacă trebuie, verificarea din `stateRepo.ts`. Un cont nou pornește cu datele demo ale Familiei Popescu.

## 7. Design

Stil luminos: fundal verde-mentă, carduri aproape albe foarte rotunjite, text verde-negru, accente verzi. Tokenii sunt în `src/app/globals.css`. Nu scrieți culori hex în componente, folosiți tokenii (`bg-surface`, `text-ink`, `text-muted`, `bg-surface-2`, `bg-hero`, `btn-dark`, `btn-blue`, `btn-soft`, `pill`, `pill-primary`, `pill-soft`, `field-input`, `tag-*`, `bg-cat-*`).

Piesele comune sunt în `src/components/shared/`: `Card`, `Sheet`, `PageHeader`, `Controls` (comutator, segmente, câmp, rând de meniu, stare goală, notă), `Badges` (iconițe pe categorii, avatar). Ferestrele și mesajele scurte se desenează în portal, peste pagină.

Limba interfeței este română, ton cald.

## 8. Reguli de lucru

- Fără comentarii în cod. Nu adăugați comentarii în fișierele noi sau modificate.
- Titlurile de commit în engleză, fără linie `Co-Authored-By`.
- Nu faceți commit sau push decât dacă sunt cerute explicit.
- Un branch per funcționalitate. Nu lucrați direct pe `main`.
- Înainte de modificări, verificați branch-ul curent și starea fișierelor.
- Verificare după fiecare pas: `npx tsc --noEmit`, `npx eslint src` și `npm test`.
- Pentru pagini noi sau modificate, verificați și la 375 px (fără depășire pe orizontală).
- În timpul desenării nu se apelează `Date.now()`, `new Date()` fără argumente sau `Math.random()`. Folosiți `demoNow()` și `uniqueId()` din `src/lib/format.ts`, doar în funcțiile care răspund la apăsări.
- Paginile cu `[id]` folosesc `generateStaticParams` și `Suspense`. După ce adăugați sau mutați o pagină, rulați `npx next typegen` înainte de `npx tsc --noEmit`.
- Starea se schimbă doar prin funcțiile din `src/context/actions.ts`, apelate prin comenzile din `src/context/commands.ts`.
- Codul din `src/server/` nu se importă în componente. Parolele și codurile de sesiune nu se scriu în jurnal și nu ajung în răspunsuri.

## 9. Comenzi

```bash
npm install
npm run dev
```

Aplicația rulează pe [http://localhost:3000](http://localhost:3000).

Pentru testarea pe telefon, în aceeași rețea Wi-Fi:

```bash
npm run build
npm start -- -H 0.0.0.0
```

Teste:

```bash
npm test
```

## 10. Ce nu este în prototip

- Resetarea parolei prin e-mail și confirmarea adresei de e-mail.
- Familie cu mai multe conturi pe aceleași date. Membrii sunt doar nume în contul tău.
- Conectare reală la furnizori și procesator de plăți real.
- Notificări push, e-mail sau SMS reale. Canalele se aleg în setări, dar reminderele apar doar în aplicație.
- Documente cu valoare fiscală sau juridică. Chitanța și sesizarea PDF sunt demonstrative, iar sesizarea nu ajunge real la furnizor.
- Oferte reale de la asigurători. Prețurile sunt simulate.
- Inteligență artificială. A fost eliminată din prototip.
