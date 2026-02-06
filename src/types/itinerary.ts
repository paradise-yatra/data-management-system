export type CostItemType = 'hotel' | 'transfer' | 'activity' | 'sightseeing' | 'other';
export type CostType = 'per_person' | 'per_night' | 'per_vehicle' | 'flat';
export type ItineraryStatus = 'draft' | 'sent' | 'confirmed' | 'cancelled';

export interface CostItem {
  _id: string;
  name: string;
  type: CostItemType;
  destination: string;
  costType: CostType;
  baseCost: number;
  currency: string;
  validityStart?: string | null;
  validityEnd?: string | null;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  costItemId: string;
  name: string;
  costType: CostType;
  baseCost: number;
}

export interface TransferItem extends ServiceItem {
  tripCount: number;
}

export interface Day {
  dayNumber: number;
  date?: string | null;
  hotel?: {
    costItemId: string;
    name: string;
    costType: CostType;
    baseCost: number;
  } | null;
  activities: ServiceItem[];
  transfers: TransferItem[];
  sightseeings: ServiceItem[];
  otherServices: ServiceItem[];
  notes?: string;
}

export interface Itinerary {
  _id: string;
  itineraryNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  destinations: string[];
  travelDates: {
    startDate: string;
    endDate: string;
  };
  pax: {
    adults: number;
    children: number;
    total: number;
  };
  nights: number;
  rooms: number;
  days: Day[];
  pricing: {
    subtotal: number;
    markup: {
      percentage: number;
      amount: number;
      isCustom: boolean;
    };
    total: number;
    currency: string;
    lastCalculatedAt?: string;
    calculationVersion: number;
  };
  status: ItineraryStatus;
  lockedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}



