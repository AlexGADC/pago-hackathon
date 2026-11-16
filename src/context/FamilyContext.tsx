"use client";

// Singura sursă de adevăr pentru starea demo-ului. Salvată în localStorage.
// Orice acțiune (contestație, misiune, plată) trece pe aici ca toată aplicația să se actualizeze instant.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { bills as initialBills, houses, INITIAL_POINTS, missions as initialMissions } from "@/data/mockFamilyData";
import type { Bill, DisputeTicket, House, HouseId, Mission } from "@/types/pago";

const STORAGE_KEY = "pago-home-family:v1";

interface DemoState {
  activeHouse: HouseId;
  points: number;
  bills: Bill[];
  tickets: DisputeTicket[];
  missions: Mission[];
}

const initialState: DemoState = {
  activeHouse: "acasa",
  points: INITIAL_POINTS,
  bills: initialBills,
  tickets: [],
  missions: initialMissions,
};

interface FamilyContextValue extends DemoState {
  house: House;
  houseBills: Bill[];
  setActiveHouse: (id: HouseId) => void;
  addPoints: (amount: number) => void;
  /** Creează tichetul, îngheață diferența și marchează factura ca plătită parțial. */
  submitDispute: (ticket: DisputeTicket) => void;
  payBill: (billId: string) => void;
  completeMission: (missionId: string) => void;
  resetDemo: () => void;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  // Citim localStorage abia după mount, ca server și client să randeze la fel.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratare unică din localStorage
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as Partial<DemoState>) });
    } catch {
      /* localStorage indisponibil — rămânem pe starea inițială */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignorăm */
    }
  }, [state, hydrated]);

  const setActiveHouse = useCallback((id: HouseId) => setState((s) => ({ ...s, activeHouse: id })), []);
  const addPoints = useCallback((amount: number) => setState((s) => ({ ...s, points: s.points + amount })), []);

  const submitDispute = useCallback((ticket: DisputeTicket) => {
    setState((s) => ({
      ...s,
      tickets: [...s.tickets.filter((t) => t.billId !== ticket.billId), ticket],
      bills: s.bills.map((b) => (b.id === ticket.billId ? { ...b, status: "platita_partial" } : b)),
    }));
  }, []);

  const payBill = useCallback((billId: string) => {
    setState((s) => ({ ...s, bills: s.bills.map((b) => (b.id === billId ? { ...b, status: "platita" } : b)) }));
  }, []);

  const completeMission = useCallback((missionId: string) => {
    setState((s) => {
      const mission = s.missions.find((m) => m.id === missionId);
      if (!mission || mission.completed) return s;
      return {
        ...s,
        points: s.points + mission.points,
        missions: s.missions.map((m) => (m.id === missionId ? { ...m, completed: true } : m)),
      };
    });
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorăm */
    }
    setState(initialState);
  }, []);

  const value = useMemo<FamilyContextValue>(() => {
    const house = houses.find((h) => h.id === state.activeHouse) ?? houses[0];
    return {
      ...state,
      house,
      houseBills: state.bills.filter((b) => b.houseId === state.activeHouse),
      setActiveHouse,
      addPoints,
      submitDispute,
      payBill,
      completeMission,
      resetDemo,
    };
  }, [state, setActiveHouse, addPoints, submitDispute, payBill, completeMission, resetDemo]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily() trebuie folosit în interiorul <FamilyProvider>.");
  return ctx;
}
