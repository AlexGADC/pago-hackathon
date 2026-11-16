# Proiect: Pago Home & Family (Hackathon MVP)

## 1. Viziunea Produsului

Reinventăm **Pago** dintr-un simplu agregator de plăți într-un **Centru de Comandă al Casei și Familiei (Pago Home & Family)**: o aplicație mobilă caldă, colaborativă și inteligentă în care părinții au liniște financiară, bunicii sunt protejați de la distanță împotriva erorilor de facturare, iar copiii/tinerii participă activ prin misiuni educative și gamification.

---

## 2. Arhitectura Celor 4 Ecrane (Bottom Navigation)

Aplicația are o bară de navigare inferioară cu **4 tab-uri principale**: **Acasă** (`/`), **Facturi** (`/facturi`), **Familie** (`/familie`) și **Radar** (`/radar`), plus un **Switcher de Locuințe** persistent în partea de sus (**„🏠 Casa Noastră”** / **„👵 Casa Bunicilor”**).

### Tab 1: Acasă (Hub-ul Familiei)

- **Switcher de Locuințe (Top Bar):** comutare instantanee între _Casa Noastră_ și _Casa Bunicilor_; facturile, alertele și statusul se actualizează pentru locuința selectată.
- **Cardul „Sănătatea Lunară a Bugetului”:** totalul de plată al lunii, comparația cu luna trecută și un indicator (Verde = normal, Roșu = anomalie).
- **Cardul „Family Points Pool” (Pușculița Comună):** bara de progres (ex: `2.450 / 3.000 pct`) și obiectivul ales de familie: reducere la următoarea factură (_-50 RON la curent_) SAU donație către un ONG (_Salvați Copiii / MagicCAMP_).
- **Acțiuni Rapide:** _Plătește tot ce e validat (1-Click)_, _Scanează Contor_, _Împarte o cheltuială (Split Link)_.

### Tab 2: Facturi & Pago AI Bodyguard (Zero-Call Advocate)

- **Lista de facturi sincronizate automat**, fiecare cu badge AI:
  - ✅ **Verificată (Normală):** în media ultimelor 12 luni — plată instant.
  - 🚨 **Red Flag:** _Electrica Furnizare — 1.480 RON (+469% față de media de 260 RON)_ sau la _Casa Bunicilor_: _Retim Salubritate — 110 RON (5 persoane facturate în loc de 2)_.
- **„Întreabă Pago AI”** — se deschide doar la cerere sau pe facturile cu _Red Flag_ (event-driven, cost zero pe facturile normale).
  - **Explicație pe înțelesul tuturor** (_„Ți-au estimat un index de 14.850 kWh în loc de ~12.410 kWh”_).
  - **Flux A (cu contor — Curent / Gaz / Apă):**
    1. Poză la contor (sau butonul **„Folosește poză contor exemplu”**) SAU tab-ul **„Introdu indexul manual”**.
    2. **Claude Vision** citește indexul (`12.410 kWh`) într-un **câmp editabil** pentru confirmare.
    3. **Validare:** indexul trebuie să fie ≥ ultimul index confirmat (`12.150 kWh`) și ≤ indexul facturat (`14.850 kWh`). Etichetă de încredere: _„Verificat AI + Poză”_ sau _„Declarat manual de client (supus regularizării)”_.
    4. **Rezoluție:** sesizare structurată către furnizor, diferența (`1.220 RON`) înghețată, plată pe loc doar a **sumei corecte (`260 RON`)**, **+500 Puncte Bounty** în _Family Pool_.
  - **Flux B (fără contor — Salubritate / Telecom):** AI-ul identifică linia greșită din PDF (_nr. persoane_ / _extraopțiune_), utilizatorul confirmă cu 1 tap, se plătește doar suma corectă (`45 RON`).
- **Status Tracker Contestații:** pe factura contestată (_Trimisă → În analiză → Factură stornată_), cu termenul legal (15/30 zile).

### Tab 3: Familie & Misiuni

- **Membri & Roluri:** Părinți (Admin), Copii/Adolescenți (Junior — fără carduri, doar misiuni și puncte), Bunici (Profil protejat).
- **Misiuni:** 📸 **Autocitire** (+150 pct, AI-ul validează poza), 🌱 **Eco-Streak** (+200 pct), 🛡️ **Bounty Hunter** (+500 pct).
- **Split & Request:** link de plată copiabil pentru WhatsApp, fără cont Pago pentru ceilalți.

### Tab 4: Radar & Scut

- **SubKill:** abonamentele casei, scumpiri ascunse, alertă înainte să expire un _Free Trial_.
- **Radar Expirări:** zile rămase până la **RCA, Rovinietă, ITP** (inclusiv mașina bunicilor), reînnoire în 2 click-uri.

---

## 3. Stack Tehnic

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Lucide React.** Next 16 diferă de ce știi: citește ghidul din `node_modules/next/dist/docs/` înainte de API-uri noi (vezi `AGENTS.md`).
- **AI:** `@anthropic-ai/sdk`, model `claude-opus-5-5` (în `src/lib/anthropic.ts`). Vision pentru contor; text/JSON pentru explicații și tichete.
- **Date:** mock în `src/data/mockFamilyData.ts` + `localStorage` (prin `FamilyContext`) pentru starea demo-ului.
- **Cheia API:** în `.env.local` (`ANTHROPIC_API_KEY=...`), niciodată în git. Model: `.env.example`.

---

## 4. Structura Proiectului (cine ce atinge)

```
src/
├── types/pago.ts                ← CONTRACTUL comun FE↔BE (se schimbă doar pe main, de comun acord)
├── data/mockFamilyData.ts       ← date simulate (ambii citesc; adăugați la final)
├── lib/
│   ├── disputes.ts              ← logică pură: validateIndex, sume, formatare, DEMO_TODAY   [comun]
│   └── anthropic.ts             ← client Claude, model, timeout 5 s                        [BACKEND]
├── app/
│   ├── layout.tsx               ← FamilyProvider + PhoneFrame                              [FRONTEND]
│   ├── page.tsx · facturi/ · familie/ · radar/   ← doar montează ecranul din components     [FRONTEND]
│   └── api/                                                                                [BACKEND]
│       ├── analyze-meter/route.ts   ← POST: Claude Vision citește indexul (+ fallback)
│       └── dispute-chat/route.ts    ← POST: „Întreabă Pago AI” (acum doar fallback — TODO)
├── context/FamilyContext.tsx    ← starea globală: casa activă, puncte, facturi, tichete, misiuni  [FRONTEND]
└── components/                                                                             [FRONTEND]
    ├── layout/   PhoneFrame, TopBar (switcher + Reset Demo), BottomNav
    ├── shared/   Card, SectionTitle (+ SplitModal)
    ├── home/     HomeScreen
    ├── bills/    BillsScreen (+ BillDetail, DisputeFlowA, DisputeFlowB, TicketTracker)
    ├── family/   FamilyScreen (+ MissionAutocitire)
    └── radar/    RadarScreen
public/samples/contor-exemplu.jpg   ← poza demo (index vizibil 12410)
```

**Reguli de lucru în echipă (Frontend + Backend pe branch-uri):**

- `main` conține scheletul. Frontend lucrează pe `feat/frontend`, Backend pe `feat/backend`.
- Frontend atinge doar `src/components/`, `src/context/`, `src/app/**/page.tsx`, `layout.tsx`, `globals.css`.
- Backend atinge doar `src/app/api/`, `src/lib/anthropic.ts`, `.env.local`.
- `src/types/pago.ts` și `src/data/mockFamilyData.ts` se schimbă doar pe `main`, anunțat înainte.
- Frontend apelează API-ul DOAR prin tipurile din `src/types/pago.ts` (`AnalyzeMeterRequest/Response`, `DisputeChatRequest/Response`). Rutele răspund deja cu fallback, deci UI-ul se poate construi fără backend-ul final.

---

## 5. Reguli de Design

**Direcția vizuală:** „soft premium” cu **gradient albastru Pago** — fundal neutru gri-deschis, carduri albe foarte rotunjite cu umbre fine, un singur accent de culoare (albastrul), butoane principale închise (grafit) în formă de pastilă. Inspirație de stil (layout, colțuri, gradient, pastile), NU copiem imagini sau conținut din referințe. Toate valorile sunt tokens în `src/app/globals.css` — nu scrieți culori hex direct în componente.

- **Mobile-First Frame:** pe desktop, container centrat `max-w-[430px]`, `rounded-[32px]`, status bar simulat, bottom nav cu 4 tab-uri, umbră fină.
- **Hero (Acasă):** bloc mare cu `bg-hero` (gradient albastru difuz, saturat sus, care se stinge spre gri-albăstrui jos), `rounded-hero`, text alb: salut mic („Bună,”) + titlu mare („Familia Popescu”). Switcher-ul de locuințe stă în hero, ca pastilă `glass`.
- **Carduri stivuite peste hero:** întâi o bandă `glass` (ex: „🚨 Ai 1 factură suspectă →”), apoi un card alb `rounded-card shadow-card` cu suma lunii și CTA închis.
- **Carduri:** `bg-white rounded-card shadow-card` (fără border vizibil sau cu `border-line`). Spațiere generoasă (`p-5`, `gap-3`).
- **Butoane:** principal = `btn-dark` (pastilă grafit cu gradient subtil, text alb); secundar = `btn-blue`; terțiar = pastilă albă cu `shadow-card`. Butoane-iconiță rotunde (44px) pentru înapoi / apel / „…”.
- **Etichete (pastile mici pastel)** deasupra titlurilor, `rounded-full text-[11px] font-semibold`: `tag-blue` (Normală / info), `tag-red` (Red Flag), `tag-green` (Plătită / validat), `tag-orange` (puncte / misiuni), `tag-indigo` (contestată / în analiză).
- **Servicii / acțiuni rapide:** rânduri de pastile albe cu iconiță Lucide + text scurt, derulabile orizontal.
- **Carusele orizontale** (`snap-x`) pentru carduri mari: Family Pool / membrii (cu `bg-card-gradient`, ca un card bancar), expirări și abonamente pe Radar.
- **Header de ecran (în afară de Acasă):** buton rotund „înapoi” + titlu + (opțional) comutator de vedere în dreapta.
- **Bottom nav:** fundal alb, iconițe `text-muted`, tab-ul activ `text-ink` cu iconiță plină/îngroșată.
- **Culori (tokens):** `pago-blue #0066FF`, `pago-blue-dark #0047CC`, `pago-sky #6FB6FF`, `ink #0F172A`, `muted #64748B`, `app #F2F5FA`, `line #E6EBF2`, `alert #EF4444` / `alert-bg #FEF2F2`, `success #10B981` / `success-bg #ECFDF5`, `family-indigo #6366F1`, `family-coral #F97316` (doar pentru puncte/misiuni). `card-border` rămâne alias pentru `line`.
- **Limba:** 100% română, ton cald, fără jargon bancar sau birocratic.

---

## 6. Reguli Stricte de Codare (Hackathon Mode)

1. **Zero fricțiune:** fără baze de date, fără login. Utilizatorul este deja în aplicație ca _Familia Popescu_.
2. **Siguranță 100% la demo live:**
   - Butonul **„Folosește poză contor exemplu”** apare în fluxul de scanare (contestație ȘI misiunea copilului).
   - Fallback instant (date simulate realiste) dacă lipsește cheia API, lipsește poza sau Claude durează peste 5 s. Rutele API nu aruncă niciodată eroare spre UI pentru asta.
   - Fără resurse externe la runtime (fără Google Fonts, fără CDN): fontul de sistem merge și fără Wi-Fi.
   - Datele relative (zile rămase) se calculează față de `DEMO_TODAY`, ca demo-ul să arate la fel la fiecare rulare.
3. **Interactivitate reală:** orice acțiune trece prin `FamilyContext` (`submitDispute`, `payBill`, `completeMission`, `addPoints`), ca _Acasă_, _Family Pool_ și badge-urile să se actualizeze instant. Butonul discret „reset” din header readuce demo-ul la starea inițială.
