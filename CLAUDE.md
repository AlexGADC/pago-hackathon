# Proiect: Pago Smart Dispute (Hackathon MVP)

## 1. Despre Produs & Context Real Pago

**Pago** este o aplicație exclusiv mobilă (Android/iOS) de tip agregator de plăți din România. Utilizatorii își conectează o singură dată conturile de furnizori, iar Pago preia automat în fundal facturile emise (suma, istoricul și PDF-ul complet al facturii).

**Problema rezolvată:** În prezent, dacă o factură preluată automat are o eroare de facturare, utilizatorul trebuie să părăsească Pago și să sune în call-center-ul furnizorului.
**Soluția noastră (Pago Smart Dispute):** AI-ul din Pago analizează PDF-ul facturii deja preluate + istoricul de consum pe 12 luni, detectează anomaliile înainte de plată și adaptează automat fluxul de contestare în funcție de tipul furnizorului.

---

## 2. Fluxurile Principale ale Utilizatorului (Contextual AI)

### Flux A: Utilități cu Contor (ex: Electrica Furnizare — Curent / Gaz / Apă)

1. **Detecție:** Factură emisă de **1.480 RON** (față de media istorică de **260 RON**).
2. **Acțiune AI:** Din PDF-ul facturii, Pago extrage automat indexul facturat (`14.850 kWh`), ultimul index real confirmat anterior (`12.150 kWh`), codul de client și numărul facturii.
3. **Interacțiune Utilizator (2 opțiuni flexibile):**
   - **Opțiunea 1 (Recomandată — Poză Contor + AI Vision):** Utilizatorul încarcă o poză la contor (sau folosește poza demo). **Claude Vision (OCR)** citește indexul real din poză (`12.410 kWh`) și îl afișează într-un **câmp editabil** pentru confirmare.
   - **Opțiunea 2 (Introducere Manuală):** Dacă utilizatorul nu este lângă contor sau nu vrea să facă poză, poate comuta pe tab-ul/butonul _"Introdu indexul manual"_ și tastează direct valoarea.
4. **Validare Anti-Eroare & Anti-Abuz:**
   - Sistemul validează automat ca indexul introdus/detectat să nu fie mai mic decât ultimul index confirmat (`12.150 kWh`) și nici mai mare decât indexul contestat (`14.850 kWh`).
   - Tichetul primește o etichetă clară de încredere: **"Verificat AI + Poză"** (dacă are poză) sau **"Declarat manual de client (supus regularizării)"** (dacă e introdus manual).
5. **Rezoluție:** Calculează diferența de consum și suma reală estimată (`260 RON`), generează tichetul oficial și permite plata pe loc doar a **sumei necontestate (260 RON)**, înghețând diferența până la emiterea facturii storno.

### Flux B: Servicii Fără Contor (ex: Retim / Brai-Cata — Salubritate / Gunoi sau Telecom)

1. **Detecție:** Factură emisă de **110 RON** (față de abonamentul lunar constant de **45 RON**).
2. **Acțiune AI (Zero-Photo):** Fără a cere poză la contor, AI-ul scanează liniile din PDF-ul facturii și identifică cauza creșterii (ex: _„Au fost facturate 5 persoane în loc de 2”_ sau _„Extraopțiune activată fără acord”_).
3. **Interacțiune Utilizator:** Confirmă motivul detectat de AI cu 1 singur tap (fără să tasteze nimic).
4. **Rezoluție:** Generează automat sesizarea structurată către furnizor și permite plata parțială a **sumei corecte (45 RON)**.

### Flux C: Status Tracker & Termen Legal

- Un tab/ecran dedicat unde utilizatorul urmărește toate contestațiile active (_Trimisă → În analiză la furnizor → Factură stornată_), cu afișarea termenului legal de răspuns (15/30 zile).

---

## 3. Stack Tehnic & Structură

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + Lucide React (iconițe)
- **AI Engine:** Anthropic Claude API (Claude Vision pentru OCR contor + generare tichete structurate)
- **Date:** Mock JSON local (`src/data/mockBills.ts`) care simulează facturile și datele extrase din PDF-urile sincronizate de Pago + `localStorage` pentru starea tichetelor în timpul demo-ului.

---

## 4. Reguli de Design (Stilul Aplicației Mobile Pago)

- **Mobile-First Frame:** Pe ecrane desktop, aplicația se randează centrat într-un container cu lățimea `max-w-[430px]`, colțuri rotunjite (`rounded-[32px]`), bară de navigare jos (Bottom Navigation: _Facturi_, _Contestații_, _Istoric_) și umbră fină, simulând telefonul mobil pe proiector.
- **Paletă de culori Pago:**
  - Primar (Pago Blue): `#0066FF`
  - Fundal aplicație: `#F5F7FA`
  - Carduri: `#FFFFFF` cu border subtil `#E2E8F0`
  - Alertă / Anomalie factură: `#EF4444` (Roșu) pe fundal `#FEF2F2`
  - Succes / Plată parțială validată: `#10B981` (Verde)
- **Limba interfeței:** Toate textele, etichetele, alertele și tichetele generate sunt în **limba română**, clare și prietenoase.

---

## 5. Reguli Stricte de Codare (Hackathon Mode)

1. **Simplitate maximă:** NU configura baze de date (Prisma, MongoDB, Supabase) și NU crea pagini de login/register. Utilizatorul este deja autentificat (_Alexandru Popescu_), iar furnizorii sunt deja sincronizați.
2. **Siguranță 100% la Demo Live:**
   - Pe fluxul cu contor, include un buton rapid **"Folosește poză contor exemplu"** chiar sub zona de upload, ca să nu pierdem timp căutând fișiere pe scenă.
   - Adaugă un fallback automat dacă cheia API lipsește sau durează peste 5 secunde, astfel încât demo-ul să nu se blocheze niciodată.
3. **Arhitectură curată:** Păstrează componentele în `src/components/` și datele simulate în `src/data/mockBills.ts`.
