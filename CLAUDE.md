# Pago Home & Family (prototip hackathon)

## 1. Produsul

Aplicația Pago pentru familie: toate plățile casei într-un singur loc (facturi, abonamente, RCA, rovinietă, ITP). Scopul: utilizatorii plătesc direct din aplicație. Prototip cu date simulate. Nu există backend, autentificare sau procesator de plăți real.

## 2. Ecrane

Meniul de jos: **Acasă**, **Facturi**, **Abonamente**, **Asigurări**. Profilul se schimbă din iconița din stânga sus (fereastră cu cele două locuințe: Casa Noastră și Casa Bunicilor).

- **Acasă:** remindere (7 zile, 3 zile, ziua scadenței), calendarul lunii cu plăți pe categorii, lista plăților nepaiate din lună, fereastra zilei, butonul de statistici, pușculița familiei.
- **Facturi:** lista facturilor, cu starea conexiunii furnizorului și starea plății. Detaliul facturii: istoric pe 12 luni, plată, chitanță, reconectare, contestare (Flux A cu index manual pentru contor, Flux B cu un tap pentru servicii fără contor).
- **Abonamente:** lunare și anuale, cu perioade de trial și scumpiri.
- **Asigurări:** RCA, rovinietă, ITP, cu zile rămase și cost anual.
- **Statistici** (din Acasă): an sau categorie, radar pe luni, inel pe categorii, plata anuală și costul mediu lunar.
- **Familie:** ecran accesibil din profil, în pregătire.

Categorii și culori: **Facturi** albastru, **Mașini** verde (asigurările), **Abonamente** roșu.

## 3. Date și logică

- `src/data/mockFamilyData.ts`: date simulate (locuințe, facturi, abonamente, expirări, furnizori, misiuni).
- `src/context/FamilyContext.tsx`: starea demo, salvată în `localStorage`. Acțiuni: plată (`payEvent`), reconectare (`reconnect`), contestație, puncte.
- `src/lib/payments.ts`: calendarul și statisticile (plăți pe lună, an, categorie).
- `src/lib/reminders.ts`: pragurile de remindere.
- `src/lib/disputes.ts`: validarea indexului, sume, zile rămase (`DEMO_TODAY = 2026-11-16`).
- `src/types/pago.ts`: tipurile comune. Modificările se fac pe `main`, anunțate înainte.

Plata și reconectarea sunt simulate: plata devine confirmată după câteva secunde, iar un furnizor deconectat face plata să eșueze.

## 4. Design

Stil luminos: fundal verde-mentă, carduri aproape albe foarte rotunjite, text verde-negru, accente verzi. Tokenii sunt în `src/app/globals.css`. Nu scrieți culori hex în componente, folosiți tokenii (`bg-surface`, `text-ink`, `text-muted`, `bg-surface-2`, `bg-hero`, `btn-dark`, `btn-blue`, `tag-*`).

Limba interfeței este română, ton cald.

## 5. Reguli de lucru

- Fără comentarii în cod. Nu adăugați comentarii în fișierele noi sau modificate.
- Titlurile de commit în engleză, fără linie `Co-Authored-By`.
- Nu faceți commit sau push decât dacă sunt cerute explicit.
- Un branch per funcționalitate. Nu lucrați direct pe `main`.
- Înainte de modificări, verificați branch-ul curent și starea fișierelor.
- Verificare după fiecare pas: `npx tsc --noEmit` și `npx eslint src`.
- Pentru pagini noi sau modificate, verificați și la 375 px (fără depășire pe orizontală).

## 6. Comenzi

```bash
npm install
npm run dev
```

Aplicația rulează pe [http://localhost:3000](http://localhost:3000).

## 7. Ce nu este în prototip

- Backend, conturi de utilizator, sincronizare între dispozitive.
- Conectare reală la furnizori și procesator de plăți real.
- Notificări push. Remindere doar în aplicație.
- Chitanțe PDF reale.
- Inteligență artificială. A fost eliminată din prototip.
