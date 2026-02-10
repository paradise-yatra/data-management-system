import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { Plus, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlaceCategory, Trip } from '@/services/logicTravelApi';
import { logicTravelApi } from '@/services/logicTravelApi';
import { InventoryList } from '@/components/inventory/InventoryList';
import { DayTimeline } from '@/components/timeline/DayTimeline';
import { TripMap } from '@/components/map/TripMap';
import { PlacesAdminPanel } from '@/components/itinerary-admin/PlacesAdminPanel';
import { ClosuresAdminPanel } from '@/components/itinerary-admin/ClosuresAdminPanel';
import { SettingsAdminPanel } from '@/components/itinerary-admin/SettingsAdminPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useTripStore } from '@/store/useTripStore';

const DEFAULT_NEW_TRIP_NAME = 'Untitled Logic Trip';

const toDateInputValue = (date: Date) => format(date, 'yyyy-MM-dd');

export const TripBuilder = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const { user, isAdmin } = useAuth();

  const currentTrip = useTripStore((state) => state.currentTrip);
  const days = useTripStore((state) => state.days);
  const activeDayIndex = useTripStore((state) => state.activeDayIndex);
  const places = useTripStore((state) => state.places);
  const dirty = useTripStore((state) => state.dirty);
  const setPlaces = useTripStore((state) => state.setPlaces);
  const hydrateTrip = useTripStore((state) => state.hydrateTrip);
  const setActiveDayIndex = useTripStore((state) => state.setActiveDayIndex);
  const addEvent = useTripStore((state) => state.addEvent);
  const removeEvent = useTripStore((state) => state.removeEvent);
  const reorderEvents = useTripStore((state) => state.reorderEvents);
  const applyScheduledEvents = useTripStore((state) => state.applyScheduledEvents);
  const addDay = useTripStore((state) => state.addDay);
  const markClean = useTripStore((state) => state.markClean);

  const activeDay = useMemo(
    () => days.find((day) => day.dayIndex === activeDayIndex) || null,
    [days, activeDayIndex]
  );
  const placesById = useMemo(() => new Map(places.map((place) => [place._id, place])), [places]);
  const initializedTripDayRef = useRef<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savingDay, setSavingDay] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | PlaceCategory>('ALL');
  const [activeTab, setActiveTab] = useState<'builder' | 'admin'>('builder');

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 6);

  const [newTripName, setNewTripName] = useState(DEFAULT_NEW_TRIP_NAME);
  const [newTripStartDate, setNewTripStartDate] = useState(toDateInputValue(today));
  const [newTripEndDate, setNewTripEndDate] = useState(toDateInputValue(nextWeek));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => Number(a.dayIndex) - Number(b.dayIndex)),
    [days]
  );

  const loadPlaces = async () => {
    const response = await logicTravelApi.places.list({ isActive: true, limit: 500 });
    setPlaces(response.data || []);
  };

  const loadTrips = async () => {
    const response = await logicTravelApi.trips.list({ limit: 100 });
    const data = response.data || [];
    setTrips(data);
    if (params.id && data.some((trip) => trip._id === params.id)) {
      setSelectedTripId((prev) => (prev === params.id ? prev : params.id));
      return;
    }
    if (!params.id && data.length > 0) {
      const nextTripId = data[0]._id;
      setSelectedTripId((prev) => prev || nextTripId);
      navigate(`/sales/itinerary-builder/${nextTripId}`, { replace: true });
    }
  };

  const loadTripDetails = async (tripId: string) => {
    const response = await logicTravelApi.trips.getById(tripId);
    const trip = response.data;
    hydrateTrip(trip);
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await Promise.all([loadPlaces(), loadTrips()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to initialize builder');
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab === 'admin') {
      setActiveTab('builder');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (params.id && params.id !== selectedTripId) {
      setSelectedTripId(params.id);
    }
  }, [params.id, selectedTripId]);

  useEffect(() => {
    if (!selectedTripId) {
      hydrateTrip(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        await loadTripDetails(selectedTripId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedTripId]);

  useEffect(() => {
    if (!currentTrip) return;
    if (initializedTripDayRef.current !== currentTrip._id) {
      initializedTripDayRef.current = currentTrip._id;
    }

    if (sortedDays.length === 0) {
      if (initializedTripDayRef.current === `seeded:${currentTrip._id}`) {
        return;
      }
      addDay(currentTrip.startDate || new Date().toISOString());
      initializedTripDayRef.current = `seeded:${currentTrip._id}`;
      return;
    }

    if (!sortedDays.some((day) => day.dayIndex === activeDayIndex)) {
      const nextDayIndex = sortedDays[0].dayIndex;
      if (nextDayIndex !== activeDayIndex) {
        setActiveDayIndex(nextDayIndex);
      }
    }
  }, [currentTrip?._id, currentTrip?.startDate, sortedDays, activeDayIndex]);

  const recalculateActiveDay = async () => {
    if (!activeDay) return;
    try {
      const response = await logicTravelApi.logic.reorderAndRecalculate({
        tripId: currentTrip?._id,
        dayIndex: activeDay.dayIndex,
        date: activeDay.date,
        events: activeDay.events.map((event, index) => ({
          placeId: event.placeId,
          order: index,
        })),
      });

      applyScheduledEvents(activeDay.dayIndex, response.data.events || []);
      const warnings = response.data.warnings || [];
      if (warnings.length > 0) {
        toast.warning(`Recalculated with ${warnings.length} warning(s)`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to recalculate timeline');
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) {
      toast.warning('Trip name is required');
      return;
    }

    if (newTripStartDate > newTripEndDate) {
      toast.warning('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const response = await logicTravelApi.trips.create({
        userId: user?._id,
        name: newTripName.trim(),
        startDate: new Date(newTripStartDate).toISOString(),
        endDate: new Date(newTripEndDate).toISOString(),
        status: 'DRAFT',
      });

      const createdTrip = response.data;
      setTrips((prev) => [createdTrip, ...prev]);
      setSelectedTripId(createdTrip._id);
      navigate(`/sales/itinerary-builder/${createdTrip._id}`);
      toast.success('Trip created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDay = () => {
    if (!currentTrip) return;
    const nextDayIndex =
      sortedDays.length > 0 ? Math.max(...sortedDays.map((day) => day.dayIndex)) + 1 : 0;

    const startDate = currentTrip.startDate ? new Date(currentTrip.startDate) : new Date();
    startDate.setDate(startDate.getDate() + nextDayIndex);
    addDay(startDate.toISOString());
  };

  const handleTripSelection = (tripId: string) => {
    if (!tripId || tripId === selectedTripId) {
      return;
    }
    setSelectedTripId(tripId);
    navigate(`/sales/itinerary-builder/${tripId}`);
  };

  const handleSaveDay = async () => {
    if (!currentTrip || !activeDay) {
      toast.warning('Select a trip and day first');
      return;
    }

    setSavingDay(true);
    try {
      const response = await logicTravelApi.trips.saveDay(currentTrip._id, activeDay.dayIndex, {
        date: activeDay.date,
        events: activeDay.events.map((event, index) => ({
          placeId: event.placeId,
          order: index,
        })),
      });
      hydrateTrip(response.data);
      markClean();
      toast.success('Day saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save day');
    } finally {
      setSavingDay(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!activeDay) return;
    if (!event.over) return;

    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    if (activeId.startsWith('place:') && (overId.startsWith('day:') || overId.startsWith('event:'))) {
      const placeId = activeId.replace('place:', '');
      addEvent(activeDay.dayIndex, placeId);
      await recalculateActiveDay();
      return;
    }

    if (activeId.startsWith('event:') && overId.startsWith('event:') && activeId !== overId) {
      const activeClientId = activeId.replace('event:', '');
      const overClientId = overId.replace('event:', '');
      reorderEvents(activeDay.dayIndex, activeClientId, overClientId);
      await recalculateActiveDay();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar project="sales" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">LogicTravel Pro Builder</h1>
                <p className="text-sm text-muted-foreground">
                  Deterministic itinerary planning with schedule validation and route optimization.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Button
                      type="button"
                      variant={activeTab === 'builder' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('builder')}
                    >
                      Builder
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'admin' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('admin')}
                    >
                      Admin
                    </Button>
                  </>
                )}
                {activeTab === 'builder' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => recalculateActiveDay()}
                      disabled={!activeDay || loading}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Recalculate
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveDay}
                      disabled={!activeDay || savingDay}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingDay ? 'Saving...' : 'Save Day'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {activeTab === 'builder' ? (
              <>
                <Card>
                  <CardContent className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-6">
                    <div className="space-y-2 lg:col-span-2">
                      <Label>Select Trip</Label>
                      <Select
                        value={selectedTripId || undefined}
                        onValueChange={handleTripSelection}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a trip" />
                        </SelectTrigger>
                        <SelectContent>
                          {trips.map((trip) => (
                            <SelectItem key={trip._id} value={trip._id}>
                              {trip.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>New Trip Name</Label>
                      <Input value={newTripName} onChange={(event) => setNewTripName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={newTripStartDate}
                        onChange={(event) => setNewTripStartDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={newTripEndDate}
                        onChange={(event) => setNewTripEndDate(event.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={handleCreateTrip} className="w-full gap-2" disabled={loading}>
                        <Plus className="h-4 w-4" />
                        Create Trip
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap items-center gap-2">
                  {sortedDays.map((day) => {
                    const isActive = day.dayIndex === activeDayIndex;
                    return (
                      <Button
                        key={day.dayIndex}
                        type="button"
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => setActiveDayIndex(day.dayIndex)}
                      >
                        Day {day.dayIndex + 1} ({format(new Date(day.date), 'dd MMM')})
                      </Button>
                    );
                  })}
                  <Button type="button" variant="outline" onClick={handleAddDay}>
                    + Add Day
                  </Button>
                  {dirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Admin mode: manage Golden Database places, closure overrides, and deterministic logic settings.
              </p>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          {activeTab === 'builder' ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-3">
                  <InventoryList
                    places={places}
                    search={search}
                    selectedCategory={selectedCategory}
                    onSearchChange={setSearch}
                    onCategoryChange={setSelectedCategory}
                  />
                </div>
                <div className="xl:col-span-5">
                  <DayTimeline
                    day={activeDay}
                    placesById={placesById}
                    onRemoveEvent={(eventClientId) => {
                      if (!activeDay) return;
                      removeEvent(activeDay.dayIndex, eventClientId);
                      recalculateActiveDay();
                    }}
                  />
                </div>
                <div className="xl:col-span-4">
                  <TripMap day={activeDay} placesById={placesById} />
                </div>
              </div>
            </DndContext>
          ) : (
            <div className="space-y-4">
              <PlacesAdminPanel onPlacesChanged={loadPlaces} />
              <ClosuresAdminPanel places={places} />
              <SettingsAdminPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
