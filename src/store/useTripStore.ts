import { create } from 'zustand';
import type { Place, Trip, TripDay, TripEvent } from '@/services/logicTravelApi';

export interface BuilderEvent extends TripEvent {
  clientId: string;
}

export interface BuilderDay extends Omit<TripDay, 'events'> {
  events: BuilderEvent[];
}

interface TripStoreState {
  currentTrip: Trip | null;
  days: BuilderDay[];
  places: Place[];
  activeDayIndex: number;
  loading: boolean;
  dirty: boolean;
  hydrateTrip: (trip: Trip | null) => void;
  setPlaces: (places: Place[]) => void;
  setActiveDayIndex: (dayIndex: number) => void;
  setLoading: (loading: boolean) => void;
  addDay: (date: string) => void;
  addEvent: (dayIndex: number, placeId: string) => void;
  removeEvent: (dayIndex: number, eventClientId: string) => void;
  reorderEvents: (dayIndex: number, activeClientId: string, overClientId: string) => void;
  applyScheduledEvents: (dayIndex: number, events: TripEvent[]) => void;
  markClean: () => void;
  reset: () => void;
}

const createClientId = () => `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const mapTripEvents = (events: TripEvent[] = []): BuilderEvent[] =>
  events
    .slice()
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((event, index) => ({
      ...event,
      order: index,
      clientId: event._id || createClientId(),
    }));

const mapTripDays = (days: TripDay[] = []): BuilderDay[] =>
  days
    .slice()
    .sort((a, b) => Number(a.dayIndex) - Number(b.dayIndex))
    .map((day) => ({
      ...day,
      events: mapTripEvents(day.events),
    }));

const ensureDay = (days: BuilderDay[], dayIndex: number) => {
  const existing = days.find((day) => day.dayIndex === dayIndex);
  if (existing) {
    return existing;
  }

  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + dayIndex);
  const newDay: BuilderDay = {
    dayIndex,
    date: fallbackDate.toISOString(),
    events: [],
  };
  days.push(newDay);
  return newDay;
};

export const useTripStore = create<TripStoreState>((set, get) => ({
  currentTrip: null,
  days: [],
  places: [],
  activeDayIndex: 0,
  loading: false,
  dirty: false,
  hydrateTrip: (trip) =>
    set(() => {
      const days = mapTripDays(trip?.days || []);
      return {
        currentTrip: trip,
        days,
        activeDayIndex: days.length > 0 ? days[0].dayIndex : 0,
        dirty: false,
      };
    }),
  setPlaces: (places) =>
    set((state) => (state.places === places ? state : { places })),
  setActiveDayIndex: (activeDayIndex) =>
    set((state) => (state.activeDayIndex === activeDayIndex ? state : { activeDayIndex })),
  setLoading: (loading) =>
    set((state) => (state.loading === loading ? state : { loading })),
  addDay: (date) =>
    set((state) => {
      const nextIndex = state.days.length > 0 ? Math.max(...state.days.map((d) => d.dayIndex)) + 1 : 0;
      const nextDays = [...state.days, { dayIndex: nextIndex, date, events: [] }];
      return {
        days: nextDays,
        activeDayIndex: nextIndex,
        dirty: true,
      };
    }),
  addEvent: (dayIndex, placeId) =>
    set((state) => {
      const nextDays = state.days.map((day) => ({ ...day, events: [...day.events] }));
      const targetDay = ensureDay(nextDays, dayIndex);
      targetDay.events.push({
        clientId: createClientId(),
        placeId,
        order: targetDay.events.length,
        startTime: null,
        endTime: null,
        travelTimeMin: 0,
        distanceKm: 0,
        validationStatus: 'VALID',
        validationReason: null,
      });
      targetDay.events = targetDay.events.map((event, index) => ({ ...event, order: index }));
      return {
        days: nextDays.sort((a, b) => a.dayIndex - b.dayIndex),
        dirty: true,
      };
    }),
  removeEvent: (dayIndex, eventClientId) =>
    set((state) => {
      const nextDays = state.days.map((day) => {
        if (day.dayIndex !== dayIndex) return day;
        const events = day.events
          .filter((event) => event.clientId !== eventClientId)
          .map((event, index) => ({ ...event, order: index }));
        return { ...day, events };
      });
      return {
        days: nextDays,
        dirty: true,
      };
    }),
  reorderEvents: (dayIndex, activeClientId, overClientId) =>
    set((state) => {
      const nextDays = state.days.map((day) => {
        if (day.dayIndex !== dayIndex) return day;
        const activeIndex = day.events.findIndex((event) => event.clientId === activeClientId);
        const overIndex = day.events.findIndex((event) => event.clientId === overClientId);
        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
          return day;
        }

        const events = [...day.events];
        const [moved] = events.splice(activeIndex, 1);
        events.splice(overIndex, 0, moved);
        return {
          ...day,
          events: events.map((event, index) => ({ ...event, order: index })),
        };
      });
      return {
        days: nextDays,
        dirty: true,
      };
    }),
  applyScheduledEvents: (dayIndex, scheduledEvents) =>
    set((state) => {
      const nextDays = state.days.map((day) => {
        if (day.dayIndex !== dayIndex) return day;

        const currentByOrder = new Map(day.events.map((event) => [event.order, event]));
        const events = scheduledEvents
          .slice()
          .sort((a, b) => Number(a.order) - Number(b.order))
          .map((event, index) => {
            const existing = currentByOrder.get(index);
            return {
              ...existing,
              ...event,
              order: index,
              clientId: existing?.clientId || event._id || createClientId(),
            } as BuilderEvent;
          });

        return {
          ...day,
          events,
        };
      });

      return {
        days: nextDays,
        dirty: true,
      };
    }),
  markClean: () => set(() => ({ dirty: false })),
  reset: () =>
    set(() => ({
      currentTrip: null,
      days: [],
      places: [],
      activeDayIndex: 0,
      loading: false,
      dirty: false,
    })),
}));

export const selectCurrentDay = (state: TripStoreState): BuilderDay | null => {
  return state.days.find((day) => day.dayIndex === state.activeDayIndex) || null;
};

export const selectPlaceMap = (state: TripStoreState): Map<string, Place> =>
  new Map((state.places || []).map((place) => [place._id, place]));

export const selectTripDateForDay = (state: TripStoreState, dayIndex: number): string => {
  const day = state.days.find((entry) => entry.dayIndex === dayIndex);
  if (day?.date) return day.date;

  if (state.currentTrip?.startDate) {
    const start = new Date(state.currentTrip.startDate);
    start.setDate(start.getDate() + dayIndex);
    return start.toISOString();
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + dayIndex);
  return fallback.toISOString();
};

export type { TripStoreState };
