# Pago Home & Family

Aplicația Pago pentru familie: toate plățile casei într-un singur loc.

## Scopul

Aducem cât mai mulți utilizatori să plătească direct din aplicația Pago: facturi, abonamente, RCA, rovinietă, ITP, asigurarea locuinței, taxe și reîncărcări.

## Ce face aplicația

Meniul de jos are patru secțiuni: **Acasă**, **Facturi**, **Abonamente**, **Asigurări**. Profilul se schimbă din iconița de sus, în stânga. Clopoțelul din dreapta deschide notificările.

- **Acasă:** calendarul lunii cu toate plățile, suma totală și suma rămasă, reminderele și lista plăților din lună. Poți plăti una câte una sau pe toate odată. Apăsând pe o zi vezi plățile ei și totalul.
- **Facturi:** facturile de la furnizorii conectați, verificate față de media ultimelor 12 luni. Plătești din aplicație, trimiți indexul, activezi plata automată sau împarți factura cu familia. Dacă o factură pare greșită, o contești și plătești doar suma corectă, iar sesizarea o poți descărca drept PDF.
- **Abonamente:** toate abonamentele, lunare, trimestriale sau anuale. Le adaugi, le pui pe pauză, le anulezi sau le reactivezi. Aplicația te anunță când se termină un trial, când un abonament se scumpește și când nu l-ai mai folosit.
- **Asigurări:** RCA, rovinietă, ITP și PAD, cu zilele rămase. Reînnoiești din aplicație și compari ofertele.
- **Plata:** un singur ecran pentru orice plată, cu cardul ales, punctele de reducere și comisionul afișat. Urmărești plata pas cu pas până ajunge la furnizor și primești chitanță, pe care o poți descărca drept PDF. Dacă plata eșuează, vezi motivul și reîncerci.
- **Plăți automate:** cu limită de siguranță, anunț înainte de fiecare plată și jurnal.
- **Istoric:** toate plățile, cu căutare, filtre și export.
- **Notificări și remindere:** cu 7 zile, 3 zile și în ziua scadenței. Pragurile se schimbă din setări.
- **Statistici:** cheltuielile pe an și pe categorie, costul mediu lunar și bugetul lunii.
- **Alte plăți:** reîncărcare cartelă, rovinietă, taxă de pod, taxe și impozite locale.
- **Familie:** membrii, cheltuielile împărțite și misiunile cu puncte.
- **Profiluri:** fiecare locuință cu plățile ei. Poți adăuga un profil nou.
- **Ajutor:** întrebări frecvente și suport în aplicație.
- **Cont:** îți faci cont cu e-mail și parolă, iar plățile și setările rămân salvate pe server și le vezi de pe orice dispozitiv. Poți încerca aplicația și fără cont, cu datele păstrate doar pe dispozitiv.

Categoriile au culori fixe: **Facturi** albastru, **Asigurări** verde, **Abonamente** roșu, **Alte plăți** chihlimbar.

## Rulare

```bash
npm install
npm run dev
```

Apoi deschide [http://localhost:3000](http://localhost:3000).

Pentru telefon, în aceeași rețea Wi-Fi:

```bash
npm run build
npm start -- -H 0.0.0.0
```

Teste:

```bash
npm test
```

Datele demo se pot readuce la starea inițială din **Profil**, cu „Resetează demo”.

Ai nevoie de Node 24 sau mai nou. Baza de date se creează singură la prima pornire, în `data/pago.db`. Fișierul nu se urcă pe GitHub. Dacă îl ștergi, se șterg toate conturile.

## Structură

- `src/app/`: paginile aplicației
- `src/components/`: ecranele și componentele vizuale
- `src/app/api/`: rutele serverului (conturi, stare, comenzi, export)
- `src/server/`: baza de date, conturile, validarea cererilor și procesarea plăților
- `src/context/`: starea aplicației, acțiunile ei și legătura cu serverul
- `src/data/`: date simulate și cataloage (furnizori, servicii, oferte)
- `src/lib/`: logica de calcul (calendar, plăți, remindere, abonamente, istoric)
- `src/lib/pdf/`: generarea documentelor PDF (chitanța și sesizarea)
- `public/fonts/`: fontul folosit în documentele PDF
- `src/types/`: tipurile comune
- `public/avatars/`: pozele de profil
- `CLAUDE.md`: specificația completă și regulile de lucru

## Stadiu

Prototip pentru hackathon. Datele sunt simulate, iar plata este demonstrată, nu procesată. Conturile și datele sunt salvate pe server, într-o bază de date locală. Nu există conectare reală la furnizori și nici procesator de plăți real.
