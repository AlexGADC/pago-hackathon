# Pago Home & Family (prototip hackathon)

## 1. Produsul

Aplicația Pago pentru familie: toate plățile casei într-un singur loc (facturi, abonamente, RCA, rovinietă, ITP, PAD, taxe locale, reîncărcări). Scopul: utilizatorii plătesc direct din aplicație. Prototip cu date simulate. Nu există backend, autentificare sau procesator de plăți real.

## 2. Ecrane

Meniul de jos: **Acasă**, **Facturi**, **Abonamente**, **Asigurări**. Nu se adaugă alte butoane în meniu.

Bara de sus: iconița de profil din stânga deschide fereastra de sticlă închisă cu profilurile pe orizontală, „Adaugă profil” la final și legătura „Contul meu și setări”. Clopoțelul din dreapta deschide notificările și arată câte sunt necitite.

- **Acasă** (`/`): bannerul de alertă, scurtăturile (Istoric, Plăți automate, Alte plăți, Familie), calendarul lunii cu iconițe pe categorii și totalul scris mic sub lună, reminderele (Plătește, Am plătit deja, Amână), lista „De plătit în lună” cu „Plătește tot”, fereastra zilei. Calendarul rămâne elementul principal al paginii: celule pătrate, spații mici, fără alt layout în locul lui.
- **Facturi** (`/facturi`, `/facturi/[id]`, `/facturi/furnizori`): lista facturilor cu starea conexiunii și a plății, facturi întârziate, plata, chitanța, istoricul pe 12 luni, autocitirea indexului, plata automată, împărțirea cu familia, contestarea (Flux A cu index manual, Flux B cu un tap) și urmărirea sesizării. Din „Furnizori” conectezi, reconectezi sau elimini un furnizor.
- **Abonamente** (`/abonamente`, `/abonamente/[id]`, `/abonamente/nou`): lunare, trimestriale și anuale. Adăugare din lista de servicii cunoscute sau manual, editare, pauză, anulare, reactivare, ștergere. Avertizări pentru trial care se termină, scumpire și abonament nefolosit.
- **Asigurări** (`/asigurari`, `/asigurari/[id]`, `/asigurari/nou`): RCA, rovinietă, ITP și PAD, grupate pe mașină sau locuință, cu zilele rămase. Reînnoirea se face din aplicație, cu oferte de comparat.
- **Statistici** (`/statistici`): an sau categorie, radar pe luni, inel pe categorii, plata anuală, costul mediu lunar, bugetul lunar și observații.
- **Istoric** (`/istoric`): toate plățile, cu căutare, filtre (perioadă, categorie, stare), chitanță și export CSV.
- **Notificări** (`/notificari`): tot ce cere atenție, calculat din date (scadențe, plăți eșuate, furnizori deconectați, scumpiri, documente care expiră, buget depășit).
- **Profil** (`/profil`): cardurile (`/profil/carduri`), plățile automate (`/profil/plati-automate`), setările (`/profil/setari`: praguri de remindere, canale, buget, blocarea aplicației), punctele și „Resetează demo”.
- **Familie** (`/familie`): membrii, invitațiile, cheltuielile împărțite și misiunile cu puncte.
- **Alte plăți** (`/servicii`): reîncărcare cartelă, rovinietă, taxă de pod, taxe și impozite locale.
- **Ajutor** (`/ajutor`): întrebări frecvente și tichete de suport cu răspuns în aplicație.
- **Primii pași**: trei ecrane de prezentare la prima deschidere, apoi stări goale care explică ce urmează.

Categorii și culori: **Facturi** albastru, **Asigurări** verde (mașinile și locuința), **Abonamente** roșu, **Alte plăți** chihlimbar.

## 3. Date și logică

- `src/types/pago.ts`: tipurile comune. Modificările se anunță înainte.
- `src/data/mockFamilyData.ts`: datele simulate (profiluri, facturi, abonamente, expirări, furnizori, carduri, plăți automate, membri, misiuni).
- `src/data/catalog.ts`: cataloagele (furnizori, servicii de abonament, oferte de reînnoire, taxe, operatori, întrebări frecvente).
- `src/context/appState.ts`: forma stării și starea inițială. Cheia din `localStorage` este `pago-home-family:v2`.
- `src/context/actions.ts`: toate schimbările de stare, ca funcții pure (plată, contestație, abonamente, asigurări, carduri, plăți automate, familie). Aici se adaugă orice acțiune nouă, cu test în `actions.test.ts`.
- `src/context/store.ts`: stocul extern, citit cu `useSyncExternalStore` și salvat în `localStorage`.
- `src/context/FamilyContext.tsx`: `FamilyProvider` și `useFamily()`. Pornește cronometrele care avansează plățile, sincronizarea și tichetele. Ține starea de interfață (fereastra de plată, mesajele scurte).
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

## 5. Design

Stil luminos: fundal verde-mentă, carduri aproape albe foarte rotunjite, text verde-negru, accente verzi. Tokenii sunt în `src/app/globals.css`. Nu scrieți culori hex în componente, folosiți tokenii (`bg-surface`, `text-ink`, `text-muted`, `bg-surface-2`, `bg-hero`, `btn-dark`, `btn-blue`, `btn-soft`, `pill`, `pill-primary`, `pill-soft`, `field-input`, `tag-*`, `bg-cat-*`).

Piesele comune sunt în `src/components/shared/`: `Card`, `Sheet`, `PageHeader`, `Controls` (comutator, segmente, câmp, rând de meniu, stare goală, notă), `Badges` (iconițe pe categorii, avatar). Ferestrele și mesajele scurte se desenează în portal, peste pagină.

Limba interfeței este română, ton cald.

## 6. Reguli de lucru

- Fără comentarii în cod. Nu adăugați comentarii în fișierele noi sau modificate.
- Titlurile de commit în engleză, fără linie `Co-Authored-By`.
- Nu faceți commit sau push decât dacă sunt cerute explicit.
- Un branch per funcționalitate. Nu lucrați direct pe `main`.
- Înainte de modificări, verificați branch-ul curent și starea fișierelor.
- Verificare după fiecare pas: `npx tsc --noEmit`, `npx eslint src` și `npm test`.
- Pentru pagini noi sau modificate, verificați și la 375 px (fără depășire pe orizontală).
- În timpul desenării nu se apelează `Date.now()`, `new Date()` fără argumente sau `Math.random()`. Folosiți `demoNow()` și `uniqueId()` din `src/lib/format.ts`, doar în funcțiile care răspund la apăsări.
- Paginile cu `[id]` folosesc `generateStaticParams` și `Suspense`. După ce adăugați sau mutați o pagină, rulați `npx next typegen` înainte de `npx tsc --noEmit`.
- Starea se schimbă doar prin funcțiile din `src/context/actions.ts`.

## 7. Comenzi

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

## 8. Ce nu este în prototip

- Backend, conturi de utilizator, sincronizare între dispozitive.
- Conectare reală la furnizori și procesator de plăți real.
- Notificări push, e-mail sau SMS reale. Canalele se aleg în setări, dar reminderele apar doar în aplicație.
- Chitanțe PDF reale. Chitanța se descarcă drept text.
- Oferte reale de la asigurători. Prețurile sunt simulate.
- Inteligență artificială. A fost eliminată din prototip.
