# Pago Home & Family

Aplicația Pago pentru familie: toate plățile casei într-un singur loc.

## Scopul

Aducem cât mai mulți utilizatori să plătească direct din aplicația Pago: facturi, abonamente, RCA, rovinietă, ITP.

## Ce face aplicația

Meniul de jos are patru secțiuni: **Acasă**, **Facturi**, **Abonamente**, **Asigurări**. Profilul se schimbă din iconița de sus, în stânga.

- **Acasă:** calendarul lunii cu toate plățile (facturi, abonamente, RCA, rovinietă, ITP), suma rămasă de plătit și lista plăților nepaiate din lună. Apăsând pe o zi vezi plățile ei și totalul. De aici pornește pagina de statistici.
- **Facturi:** lista facturilor, cu verificarea lor față de media ultimelor 12 luni. Dacă o factură pare greșită, o poți contesta: introduci indexul de pe contor și plătești doar suma corectă. Facturile fără probleme se plătesc direct din aplicație.
- **Abonamente:** abonamentele casei, cu plata lunară sau anuală, perioadele de trial și scumpirile.
- **Asigurări:** RCA, rovinietă și ITP, cu zilele rămase până la expirare și costul anual.
- **Statistici** (din Acasă): cheltuielile pe an și pe categorie, plata anuală estimată și costul mediu lunar.
- **Profiluri:** casa ta și casa bunicilor, fiecare cu propria poză. Din profil poți schimba locuința.

Categoriile au culori fixe: **Facturi** albastru, **Mașini** verde (asigurările), **Abonamente** roșu.

## Rulare

```bash
npm install
npm run dev
```

Apoi deschide [http://localhost:3000](http://localhost:3000).

## Structură

- `src/app/`: paginile aplicației (Acasă, Facturi, Abonamente, Asigurări, Statistici, Familie)
- `src/components/`: ecranele și componentele vizuale
- `src/context/`: starea aplicației
- `src/data/`: date simulate (facturi, abonamente, expirări, profiluri)
- `src/lib/`: logica de calcul (calendar și plăți, validarea indexului, sume, zile rămase)
- `src/types/`: tipurile comune
- `public/avatars/`: pozele de profil
- `CLAUDE.md`: specificația completă și regulile de design

## Stadiu

Prototip pentru hackathon. Datele sunt simulate, iar plata este demonstrată, nu procesată.

Urmează: remindere cu mai multe praguri (7, 3 zile și în ziua scadenței) și statusuri clare pentru fiecare plată, până ajunge la furnizor.
