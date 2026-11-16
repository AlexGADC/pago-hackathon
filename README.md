# Pago Home & Family

Aplicația Pago pentru familie: toate plățile casei într-un singur loc.

## Scopul

Aducem cât mai mulți utilizatori să plătească direct din aplicația Pago: facturi, abonamente, RCA, rovinietă, ITP.

## Ce face aplicația

- **Acasă:** suma de plată a lunii, alertele și acțiunile rapide.
- **Facturi:** lista facturilor, cu verificarea lor față de media ultimelor 12 luni. Dacă o factură pare greșită, o poți contesta: introduci indexul de pe contor și plătești doar suma corectă.
- **Familie:** locuințe multiple (casa ta și casa bunicilor), membri, roluri și pușculița comună.
- **Radar:** abonamentele (Netflix, Spotify, Disney+ etc.), perioadele de trial și datele de expirare pentru RCA, rovinietă și ITP.

## Rulare

```bash
npm install
npm run dev
```

Apoi deschide [http://localhost:3000](http://localhost:3000).

## Structură

- `src/app/`: paginile aplicației
- `src/components/`: ecranele și componentele vizuale
- `src/context/`: starea aplicației
- `src/data/`: date simulate (facturi, abonamente, expirări)
- `src/lib/`: logica de calcul (validarea indexului, sume, zile rămase)
- `src/types/`: tipurile comune
- `CLAUDE.md`: specificația completă și regulile de design

## Stadiu

Prototip pentru hackathon. Datele sunt simulate, iar plata este demonstrată, nu procesată.
