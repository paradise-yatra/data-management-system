import Itinerary from '../models/Itinerary.js';
import CostItem from '../models/CostItem.js';
import { generateItineraryNumber } from '../utils/itineraryNumberGenerator.js';
import { calculateItineraryPricing, recalculateItineraryPricing } from '../services/pricingEngine.js';

// List all itineraries with filters
export const listItineraries = async (req, res) => {
  try {
    const {
      status,
      clientName,
      startDate,
      endDate,
      createdBy,
      page = 1,
      limit = 50,
    } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (clientName) {
      query.clientName = { $regex: clientName, $options: 'i' };
    }
    
    if (startDate || endDate) {
      query['travelDates.startDate'] = {};
      if (startDate) {
        query['travelDates.startDate'].$gte = new Date(startDate);
      }
      if (endDate) {
        query['travelDates.startDate'].$lte = new Date(endDate);
      }
    }
    
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const itineraries = await Itinerary.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Itinerary.countDocuments(query);
    
    res.json({
      success: true,
      data: itineraries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error listing itineraries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch itineraries',
      error: error.message,
    });
  }
};

// Get a single itinerary
export const getItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }
    
    res.json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch itinerary',
      error: error.message,
    });
  }
};

// Create a new itinerary
export const createItinerary = async (req, res) => {
  try {
    const {
      clientName,
      clientEmail,
      clientPhone,
      destinations,
      travelDates,
      pax,
      nights,
      rooms,
      days,
      markupPercentage,
    } = req.body;
    
    // Validate required fields
    if (!clientName || !destinations || !travelDates || !pax || !nights || !rooms) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientName, destinations, travelDates, pax, nights, rooms',
      });
    }
    
    // Validate dates
    if (new Date(travelDates.startDate) >= new Date(travelDates.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }
    
    // Validate cost items exist and create snapshots
    if (days && Array.isArray(days)) {
      for (const day of days) {
        // Validate hotel
        if (day.hotel && day.hotel.costItemId) {
          const hotelItem = await CostItem.findById(day.hotel.costItemId);
          if (!hotelItem) {
            return res.status(400).json({
              success: false,
              message: `Hotel cost item not found for day ${day.dayNumber}`,
            });
          }
          day.hotel.name = hotelItem.name;
          day.hotel.costType = hotelItem.costType;
          day.hotel.baseCost = hotelItem.baseCost;
        }
        
        // Validate activities
        if (day.activities && Array.isArray(day.activities)) {
          for (const activity of day.activities) {
            const activityItem = await CostItem.findById(activity.costItemId);
            if (!activityItem) {
              return res.status(400).json({
                success: false,
                message: `Activity cost item not found for day ${day.dayNumber}`,
              });
            }
            activity.name = activityItem.name;
            activity.costType = activityItem.costType;
            activity.baseCost = activityItem.baseCost;
          }
        }
        
        // Validate transfers
        if (day.transfers && Array.isArray(day.transfers)) {
          for (const transfer of day.transfers) {
            const transferItem = await CostItem.findById(transfer.costItemId);
            if (!transferItem) {
              return res.status(400).json({
                success: false,
                message: `Transfer cost item not found for day ${day.dayNumber}`,
              });
            }
            transfer.name = transferItem.name;
            transfer.costType = transferItem.costType;
            transfer.baseCost = transferItem.baseCost;
          }
        }
        
        // Validate sightseeings
        if (day.sightseeings && Array.isArray(day.sightseeings)) {
          for (const sightseeing of day.sightseeings) {
            const sightseeingItem = await CostItem.findById(sightseeing.costItemId);
            if (!sightseeingItem) {
              return res.status(400).json({
                success: false,
                message: `Sightseeing cost item not found for day ${day.dayNumber}`,
              });
            }
            sightseeing.name = sightseeingItem.name;
            sightseeing.costType = sightseeingItem.costType;
            sightseeing.baseCost = sightseeingItem.baseCost;
          }
        }
        
        // Validate other services
        if (day.otherServices && Array.isArray(day.otherServices)) {
          for (const service of day.otherServices) {
            const serviceItem = await CostItem.findById(service.costItemId);
            if (!serviceItem) {
              return res.status(400).json({
                success: false,
                message: `Service cost item not found for day ${day.dayNumber}`,
              });
            }
            service.name = serviceItem.name;
            service.costType = serviceItem.costType;
            service.baseCost = serviceItem.baseCost;
          }
        }
      }
    }
    
    // Generate itinerary number
    const itineraryNumber = await generateItineraryNumber();
    
    // Create itinerary
    const itinerary = new Itinerary({
      itineraryNumber,
      clientName,
      clientEmail: clientEmail || '',
      clientPhone: clientPhone || '',
      destinations: Array.isArray(destinations) ? destinations : [destinations],
      travelDates: {
        startDate: new Date(travelDates.startDate),
        endDate: new Date(travelDates.endDate),
      },
      pax: {
        adults: parseInt(pax.adults),
        children: parseInt(pax.children || 0),
      },
      nights: parseInt(nights),
      rooms: parseInt(rooms),
      days: days || [],
      pricing: {
        markup: {
          percentage: markupPercentage || null,
          isCustom: markupPercentage !== null && markupPercentage !== undefined,
        },
      },
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
    });
    
    // Calculate pricing
    const pricing = await calculateItineraryPricing(itinerary, markupPercentage);
    itinerary.pricing = pricing;
    
    await itinerary.save();
    
    res.status(201).json({
      success: true,
      message: 'Itinerary created successfully',
      data: itinerary,
    });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create itinerary',
      error: error.message,
    });
  }
};

// Update an itinerary
export const updateItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }
    
    // Check if locked
    if (itinerary.lockedAt || ['sent', 'confirmed'].includes(itinerary.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update locked itinerary',
      });
    }
    
    const {
      clientName,
      clientEmail,
      clientPhone,
      destinations,
      travelDates,
      pax,
      nights,
      rooms,
      days,
      markupPercentage,
    } = req.body;
    
    // Update fields
    if (clientName !== undefined) itinerary.clientName = clientName;
    if (clientEmail !== undefined) itinerary.clientEmail = clientEmail;
    if (clientPhone !== undefined) itinerary.clientPhone = clientPhone;
    if (destinations !== undefined) {
      itinerary.destinations = Array.isArray(destinations) ? destinations : [destinations];
    }
    if (travelDates !== undefined) {
      if (travelDates.startDate) {
        itinerary.travelDates.startDate = new Date(travelDates.startDate);
      }
      if (travelDates.endDate) {
        itinerary.travelDates.endDate = new Date(travelDates.endDate);
      }
      
      // Validate dates
      if (itinerary.travelDates.startDate >= itinerary.travelDates.endDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
        });
      }
    }
    if (pax !== undefined) {
      if (pax.adults !== undefined) itinerary.pax.adults = parseInt(pax.adults);
      if (pax.children !== undefined) itinerary.pax.children = parseInt(pax.children);
    }
    if (nights !== undefined) itinerary.nights = parseInt(nights);
    if (rooms !== undefined) itinerary.rooms = parseInt(rooms);
    if (markupPercentage !== undefined) {
      itinerary.pricing.markup.percentage = markupPercentage;
      itinerary.pricing.markup.isCustom = true;
    }
    
    // Validate and update days with cost item snapshots
    if (days !== undefined) {
      for (const day of days) {
        // Validate hotel
        if (day.hotel && day.hotel.costItemId) {
          const hotelItem = await CostItem.findById(day.hotel.costItemId);
          if (!hotelItem) {
            return res.status(400).json({
              success: false,
              message: `Hotel cost item not found for day ${day.dayNumber}`,
            });
          }
          day.hotel.name = hotelItem.name;
          day.hotel.costType = hotelItem.costType;
          day.hotel.baseCost = hotelItem.baseCost;
        }
        
        // Validate activities
        if (day.activities && Array.isArray(day.activities)) {
          for (const activity of day.activities) {
            const activityItem = await CostItem.findById(activity.costItemId);
            if (!activityItem) {
              return res.status(400).json({
                success: false,
                message: `Activity cost item not found for day ${day.dayNumber}`,
              });
            }
            activity.name = activityItem.name;
            activity.costType = activityItem.costType;
            activity.baseCost = activityItem.baseCost;
          }
        }
        
        // Validate transfers
        if (day.transfers && Array.isArray(day.transfers)) {
          for (const transfer of day.transfers) {
            const transferItem = await CostItem.findById(transfer.costItemId);
            if (!transferItem) {
              return res.status(400).json({
                success: false,
                message: `Transfer cost item not found for day ${day.dayNumber}`,
              });
            }
            transfer.name = transferItem.name;
            transfer.costType = transferItem.costType;
            transfer.baseCost = transferItem.baseCost;
          }
        }
        
        // Validate sightseeings
        if (day.sightseeings && Array.isArray(day.sightseeings)) {
          for (const sightseeing of day.sightseeings) {
            const sightseeingItem = await CostItem.findById(sightseeing.costItemId);
            if (!sightseeingItem) {
              return res.status(400).json({
                success: false,
                message: `Sightseeing cost item not found for day ${day.dayNumber}`,
              });
            }
            sightseeing.name = sightseeingItem.name;
            sightseeing.costType = sightseeingItem.costType;
            sightseeing.baseCost = sightseeingItem.baseCost;
          }
        }
        
        // Validate other services
        if (day.otherServices && Array.isArray(day.otherServices)) {
          for (const service of day.otherServices) {
            const serviceItem = await CostItem.findById(service.costItemId);
            if (!serviceItem) {
              return res.status(400).json({
                success: false,
                message: `Service cost item not found for day ${day.dayNumber}`,
              });
            }
            service.name = serviceItem.name;
            service.costType = serviceItem.costType;
            service.baseCost = serviceItem.baseCost;
          }
        }
      }
      
      itinerary.days = days;
    }
    
    itinerary.updatedBy = req.user?.id || null;
    
    // Recalculate pricing
    const pricing = await calculateItineraryPricing(
      itinerary,
      itinerary.pricing.markup.isCustom ? itinerary.pricing.markup.percentage : null
    );
    itinerary.pricing = pricing;
    
    await itinerary.save();
    
    res.json({
      success: true,
      message: 'Itinerary updated successfully',
      data: itinerary,
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update itinerary',
      error: error.message,
    });
  }
};

// Recalculate itinerary pricing
export const recalculateItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }
    
    const pricing = await recalculateItineraryPricing(itinerary);
    itinerary.pricing = pricing;
    itinerary.updatedBy = req.user?.id || null;
    
    await itinerary.save();
    
    res.json({
      success: true,
      message: 'Pricing recalculated successfully',
      data: itinerary,
    });
  } catch (error) {
    console.error('Error recalculating itinerary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to recalculate itinerary',
      error: error.message,
    });
  }
};

// Lock itinerary pricing
export const lockItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }
    
    itinerary.lockedAt = new Date();
    if (!['sent', 'confirmed'].includes(itinerary.status)) {
      itinerary.status = 'sent';
    }
    itinerary.updatedBy = req.user?.id || null;
    
    await itinerary.save();
    
    res.json({
      success: true,
      message: 'Itinerary locked successfully',
      data: itinerary,
    });
  } catch (error) {
    console.error('Error locking itinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock itinerary',
      error: error.message,
    });
  }
};

// Delete an itinerary
export const deleteItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findByIdAndDelete(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Itinerary deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete itinerary',
      error: error.message,
    });
  }
};



