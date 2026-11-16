# Proiect: Pago Home & Family (Hackathon MVP)

## 1. Viziunea Produsului

Reinventăm **Pago** dintr-un simplu agregator de plăți într-un **Centru de Comandă al Casei și Familiei (Pago Home & Family)**: o aplicație mobilă caldă, colaborativă și inteligentă în care părinții au liniște financiară, bunicii sunt protejați de la distanță împotriva erorilor de facturare, iar copiii/tinerii participă activ prin misiuni educative și gamification.

---

## 2. Arhitectura Celor 4 Ecrane (Bottom Navigation)

Aplicația are o bară de navigare inferioară cu **4 tab-uri principale**: **Acasă**, **Facturi**, **Familie** și **Radar**, plus un **Switcher de Locuințe** persistent în partea de sus (**„🏠 Casa Noastră”** / **„👵 Casa Bunicilor”**).

### Tab 1: Acasă (Hub-ul Familiei)

- **Switcher de Locuințe (Top Bar):** Permite comutarea instantanee între profilul principal (_Casa Noastră_) și profilul secundar gestionat de la distanță (_Casa Bunicilor_), actualizând facturile, alertele și statusul pentru locuința selectată.
- **Cardul „Sănătatea Lunară a Bugetului”:** Afișează totalul de plată al lunii curente, comparația față de luna trecută și un indicator clar de status (Verde = totul normal, Roșu = alertă anomalie detectată).
- **Cardul „Family Points Pool” (Pușculița Comună):**
  - Bara de progres cu punctele strânse împreună de membrii familiei (ex: `2.450 / 3.000 pct`).
  - Obiectivul activ ales de familie: reducere directă la următoarea factură (ex: _-50 RON la curent_) SAU donație către un ONG partener (ex: _Salvați Copiii / MagicCAMP_).
- **Acțiuni Rapide (Quick Actions):** _Plătește tot ce e validat (1-Click)_, _Scanează Contor_, _Împarte o cheltuială (Split Link)_.

### Tab 2: Facturi & Pago AI Bodyguard (Zero-Call Advocate)

- **Lista de facturi sincronizate automat:** Fiecare factură afișează un badge de verificare AI:
  - ✅ **Verificată (Normală):** În media ultimelor 12 luni — se poate plăti instant.
  - 🚨 **Red Flag (Anomalie):** Ex: _Electrica Furnizare — 1.480 RON (+469% față de media de 260 RON)_ sau la _Casa Bunicilor_: _Salubritate Retim — 110 RON (5 persoane facturate în loc de 2)_.
- **Asistentul Conversațional pe Factură („Întreabă Pago AI”):**
  - Se deschide doar la cerere sau pe facturile cu _Red Flag_ (arhitectură _event-driven_, cost zero pe facturile normale).
  - **Explicație pe înțelesul tuturor:** AI-ul rezumă eroarea din PDF fără limbaj birocratic (_„Ți-au estimat un index de 14.850 kWh în loc de ~12.410 kWh”_).
  - **Flux A (Utilități cu contor — Curent / Gaz / Apă):**
    1. Utilizatorul încarcă o poză la contor (sau apasă butonul rapid **"Folosește poză contor exemplu"**) SAU comută pe **"Introdu indexul manual"**.
    2. **Claude Vision (OCR)** citește indexul din poză (`12.410 kWh`) și îl pune într-un **câmp editabil** pentru confirmare.
    3. **Validare inteligentă:** Sistemul verifică ca indexul să nu fie mai mic decât ultimul index confirmat anterior (`12.150 kWh`) și marchează tichetul cu nivelul de încredere (_„Verificat AI + Poză”_ vs. _„Declarat manual”_).
    4. **Rezoluție:** Generează sesizarea structurată către furnizor (0 apeluri telefonice), îngheață diferența contestată (`1.220 RON`), permite plata pe loc doar a **sumei corecte (`260 RON`)** și acordă **+500 Puncte Bounty** în _Family Pool_.
  - **Flux B (Servicii fără contor — Salubritate / Telecom):**
    1. AI-ul identifică automat eroarea din liniile PDF-ului (ex: _număr greșit de persoane_ sau _extraopțiune nedorită_).
    2. Utilizatorul confirmă cu 1 tap, se trimite sesizarea și se plătește doar suma corectă (`45 RON`).
- **Status Tracker Contestații:** Vizibil direct pe factura contestată (_Trimisă → În analiză → Factură stornată_), cu termenul legal afișat.

### Tab 3: Familie & Misiuni (Engaging & Kid/Gen-Z Friendly)

- **Membrii Familiei & Roluri:** Părinți (Admin), Copii/Adolescenți (Junior — fără acces la carduri bancare, doar misiuni și puncte), Bunici (Profil protejat).
- **Misiuni Lunare Gamificate:**
  - 📸 **Misiunea Autocitire (pentru copii/tineri):** Fă poza la contor în fereastra de autocitire -> AI-ul validează poza -> câștigi **+150 Puncte** în _Family Pool_ și previi facturile estimate greșit.
  - 🌱 **Eco-Streak:** Consum mai mic de electricitate/apă decât luna trecută -> **+200 Puncte Bonus**.
  - 🛡️ **Bounty Hunter:** Ai prins și contestat o factură greșită -> **+500 Puncte**.
- **Split & Request (Împarte o cheltuială):** Generator de link de plată rapid (pentru a cere contribuția membrilor familiei sau colegilor de apartament pe WhatsApp, fără ca aceștia să aibă nevoie de cont Pago).

### Tab 4: Radar & Scut (Prevenție & Abonamente)

- **SubKill (Vânătorul de Abonamente):** Listează abonamentele casei (Netflix, Spotify, iCloud, sală, internet), semnalează creșterile ascunse de preț și trimite alerte înainte să expire un _Free Trial_.
- **Radar Expirări Auto & Casă:** Carduri vizuale cu zile rămase până la expirarea **RCA, Rovinietă, ITP** (pentru mașina familiei și mașina bunicilor), cu reînnoire în 2 click-uri.

---

## 3. Stack Tehnic & Arhitectură

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + Lucide React (iconițe)
- **AI Engine:** Anthropic Claude API:
  - _Claude Vision_ pentru citirea indexului de pe poza contorului.
  - _Claude Text / JSON_ pentru analiza anomaliei din factura simulată, conversația din _Pago AI Bodyguard_ și generarea tichetului oficial.
- **Date:** Mock JSON structurat (`src/data/mockFamilyData.ts`) care conține datele pentru ambele locuințe (_Casa Noastră_ și _Casa Bunicilor_), facturile cu istoric pe 12 luni, abonamentele și misiunile + `localStorage` pentru persistența acțiunilor în timpul demo-ului.

---

## 4. Reguli de Design (Estetica „Pago Home & Family”)

- **Mobile-First Frame:** Pe ecrane desktop, aplicația se randează centrat într-un container cu lățimea `max-w-[430px]`, colțuri rotunjite (`rounded-[32px]`), status bar simulat sus, bară de navigare jos cu 4 tab-uri și umbră fină, arătând ca o aplicație nativă iOS/Android pe proiector.
- **Paletă de culori (Caldă, Modernă, Prietenoasă):**
  - Primar (Pago Blue): `#0066FF`
  - Secundar / Family Accent (Warm Coral / Indigo): `#6366F1` și `#F97316` (pentru badge-uri de familie/misiuni)
  - Fundal aplicație: `#F6F8FC`
  - Carduri: `#FFFFFF` cu colțuri rotunjite (`rounded-2xl`) și border subtil `#E2E8F0`
  - Alertă Red Flag: `#EF4444` pe fundal `#FEF2F2`
  - Succes / Eco / Plată validată: `#10B981` pe fundal `#ECFDF5`
- **Limba și tonul:** 100% în **limba română**, ton cald, clar, prietenos și lipsit de jargon bancar sau birocratic.

---

## 5. Reguli Stricte de Codare (Hackathon Mode)

1. **Zero fricțiune la pornire:** Fără baze de date externe (Prisma/Supabase) și fără ecrane de login. Utilizatorul intră direct în aplicație ca _Familia Popescu_.
2. **Siguranță 100% la Demo Live:**
   - Include obligatoriu butonul **"Folosește poză contor exemplu"** în fluxul de scanare (atât la contestația facturii, cât și la misiunea copilului), pentru a nu căuta fișiere prin calculator pe scenă.
   - Implementează un fallback instant (date simulate realiste) dacă cheia API Anthropic lipsește sau durează peste 5 secunde, astfel încât prezentarea live să meargă impecabil indiferent de conexiunea la internet.
3. **Interactivitate reală în demo:** Când utilizatorul rezolvă o factură, finalizează o misiune sau plătește parțial, starea se actualizează instant în toată aplicația (scade suma de plată din _Acasă_, cresc punctele în _Family Points Pool_, iar factura trece din _Red Flag_ în _Contestație Activă / Plătită Parțial_).
