"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { bills as initialBills, houses, INITIAL_POINTS, missions as initialMissions, supplierConnections as initialConnections } from "@/data/mockFamilyData";
import type { Bill, DisputeTicket, House, HouseId, Mission, PaymentRecord, SupplierConnection } from "@/types/pago";

const STORAGE_KEY = "pago-home-family:v1";
const PAYMENT_DELAY_MS = 1800;
const SYNC_DELAY_MS = 1500;

interface DemoState {
  activeHouse: HouseId;
  points: number;
  bills: Bill[];
  tickets: DisputeTicket[];
  missions: Mission[];
  payments: PaymentRecord[];
  connections: SupplierConnection[];
}

const initialState: DemoState = {
  activeHouse: "acasa",
  points: INITIAL_POINTS,
  bills: initialBills,
  tickets: [],
  missions: initialMissions,
  payments: [],
  connections: initialConnections,
};

interface FamilyContextValue extends DemoState {
  house: House;
  houseBills: Bill[];
  setActiveHouse: (id: HouseId) => void;
  addPoints: (amount: number) => void;
  submitDispute: (ticket: DisputeTicket) => void;
  payBill: (billId: string) => void;
  payEvent: (eventId: string, supplier: string, amount: number) => void;
  reconnect: (provider: string) => void;
  completeMission: (missionId: string) => void;
  resetDemo: () => void;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

function makeReference(eventId: string): string {
  let hash = 0;
  for (const ch of eventId) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000;
  return `PG-${String(hash).padStart(6, "0")}`;
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [hydrated, setHydrated] = useState(false);

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

  useEffect(() => {
    if (!state.payments.some((p) => p.status === "in_asteptare")) return;
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, payments: s.payments.map((p) => (p.status === "in_asteptare" ? { ...p, status: "confirmata" } : p)) }));
    }, PAYMENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.payments]);

  useEffect(() => {
    if (!state.connections.some((c) => c.status === "sincronizare")) return;
    const timer = setTimeout(() => {
      setState((s) => ({
        ...s,
        connections: s.connections.map((c) => (c.status === "sincronizare" ? { ...c, status: "conectat", problem: undefined, lastSyncAt: new Date().toISOString() } : c)),
      }));
    }, SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.connections]);

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

  const payEvent = useCallback((eventId: string, supplier: string, amount: number) => {
    setState((s) => {
      if (s.payments.some((p) => p.eventId === eventId && p.status !== "esuata")) return s;
      const down = s.connections.find((c) => c.provider === supplier)?.status === "deconectat";
      const record: PaymentRecord = {
        eventId,
        supplier,
        amount,
        status: down ? "esuata" : "in_asteptare",
        createdAt: new Date().toISOString(),
        reference: makeReference(eventId),
      };
      return { ...s, payments: [...s.payments.filter((p) => p.eventId !== eventId), record] };
    });
  }, []);

  const reconnect = useCallback((provider: string) => {
    setState((s) => ({
      ...s,
      connections: s.connections.map((c) => (c.provider === provider && c.status === "deconectat" ? { ...c, status: "sincronizare" } : c)),
    }));
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
      payEvent,
      reconnect,
      completeMission,
      resetDemo,
    };
  }, [state, setActiveHouse, addPoints, submitDispute, payBill, payEvent, reconnect, completeMission, resetDemo]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily() trebuie folosit în interiorul <FamilyProvider>.");
  return ctx;
}
