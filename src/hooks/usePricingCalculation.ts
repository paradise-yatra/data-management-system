import { useMemo } from 'react';
import { Day } from '@/services/itineraryApi';

interface UsePricingCalculationProps {
  days: Day[];
  pax: {
    adults: number;
    children: number;
    total: number;
  };
  nights: number;
  rooms: number;
  markupPercentage: number;
}

export const usePricingCalculation = ({
  days,
  pax,
  nights,
  rooms,
  markupPercentage,
}: UsePricingCalculationProps) => {
  const pricing = useMemo(() => {
    let subtotal = 0;
    const breakdown = {
      hotels: 0,
      activities: 0,
      transfers: 0,
      sightseeings: 0,
      otherServices: 0,
    };

    days.forEach((day) => {
      // Calculate hotel cost
      if (day.hotel) {
        let hotelCost = 0;
        switch (day.hotel.costType) {
          case 'per_night':
            hotelCost = day.hotel.baseCost * nights * rooms;
            break;
          case 'per_person':
            hotelCost = day.hotel.baseCost * pax.total;
            break;
          case 'flat':
            hotelCost = day.hotel.baseCost;
            break;
          default:
            hotelCost = 0;
        }
        breakdown.hotels += hotelCost;
        subtotal += hotelCost;
      }

      // Calculate activities
      day.activities?.forEach((activity) => {
        let cost = 0;
        switch (activity.costType) {
          case 'per_person':
            cost = activity.baseCost * pax.total;
            break;
          case 'flat':
            cost = activity.baseCost;
            break;
          default:
            cost = 0;
        }
        breakdown.activities += cost;
        subtotal += cost;
      });

      // Calculate transfers
      day.transfers?.forEach((transfer) => {
        let cost = 0;
        switch (transfer.costType) {
          case 'per_vehicle':
            cost = transfer.baseCost * (transfer.tripCount || 1);
            break;
          case 'flat':
            cost = transfer.baseCost;
            break;
          default:
            cost = 0;
        }
        breakdown.transfers += cost;
        subtotal += cost;
      });

      // Calculate sightseeings
      day.sightseeings?.forEach((sightseeing) => {
        let cost = 0;
        switch (sightseeing.costType) {
          case 'per_person':
            cost = sightseeing.baseCost * pax.total;
            break;
          case 'flat':
            cost = sightseeing.baseCost;
            break;
          default:
            cost = 0;
        }
        breakdown.sightseeings += cost;
        subtotal += cost;
      });

      // Calculate other services
      day.otherServices?.forEach((service) => {
        let cost = 0;
        switch (service.costType) {
          case 'per_person':
            cost = service.baseCost * pax.total;
            break;
          case 'per_night':
            cost = service.baseCost * nights * rooms;
            break;
          case 'flat':
            cost = service.baseCost;
            break;
          default:
            cost = 0;
        }
        breakdown.otherServices += cost;
        subtotal += cost;
      });
    });

    // Round subtotal
    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    // Calculate markup
    const markupAmount = Math.round((subtotal * (markupPercentage / 100) + Number.EPSILON) * 100) / 100;

    // Calculate total
    const total = Math.round((subtotal + markupAmount + Number.EPSILON) * 100) / 100;

    return {
      subtotal,
      markup: {
        percentage: markupPercentage,
        amount: markupAmount,
      },
      total,
      breakdown,
    };
  }, [days, pax, nights, rooms, markupPercentage]);

  return { pricing, isCalculating: false };
};

