import CostItem from '../models/CostItem.js';

// List all cost items with filters
export const listCostItems = async (req, res) => {
  try {
    const { type, destination, isActive, search, page = 1, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (destination) {
      query.destination = destination;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const costItems = await CostItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await CostItem.countDocuments(query);
    
    res.json({
      success: true,
      data: costItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error listing cost items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost items',
      error: error.message,
    });
  }
};

// Get a single cost item
export const getCostItem = async (req, res) => {
  try {
    const costItem = await CostItem.findById(req.params.id);
    
    if (!costItem) {
      return res.status(404).json({
        success: false,
        message: 'Cost item not found',
      });
    }
    
    res.json({
      success: true,
      data: costItem,
    });
  } catch (error) {
    console.error('Error fetching cost item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost item',
      error: error.message,
    });
  }
};

// Create a new cost item
export const createCostItem = async (req, res) => {
  try {
    const {
      name,
      type,
      destination,
      costType,
      baseCost,
      currency,
      validityStart,
      validityEnd,
      description,
      isActive,
    } = req.body;
    
    // Validate required fields
    if (!name || !type || !destination || !costType || baseCost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, destination, costType, baseCost',
      });
    }
    
    // Validate cost type
    const validCostTypes = ['per_person', 'per_night', 'per_vehicle', 'flat'];
    if (!validCostTypes.includes(costType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid cost type. Must be one of: ${validCostTypes.join(', ')}`,
      });
    }
    
    // Validate type
    const validTypes = ['hotel', 'transfer', 'activity', 'sightseeing', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }
    
    const costItem = new CostItem({
      name,
      type,
      destination,
      costType,
      baseCost: parseFloat(baseCost),
      currency: currency || 'INR',
      validityStart: validityStart ? new Date(validityStart) : null,
      validityEnd: validityEnd ? new Date(validityEnd) : null,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
    });
    
    await costItem.save();
    
    res.status(201).json({
      success: true,
      message: 'Cost item created successfully',
      data: costItem,
    });
  } catch (error) {
    console.error('Error creating cost item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cost item',
      error: error.message,
    });
  }
};

// Update a cost item
export const updateCostItem = async (req, res) => {
  try {
    const {
      name,
      type,
      destination,
      costType,
      baseCost,
      currency,
      validityStart,
      validityEnd,
      description,
      isActive,
    } = req.body;
    
    // Validate cost type if provided
    if (costType) {
      const validCostTypes = ['per_person', 'per_night', 'per_vehicle', 'flat'];
      if (!validCostTypes.includes(costType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid cost type. Must be one of: ${validCostTypes.join(', ')}`,
        });
      }
    }
    
    // Validate type if provided
    if (type) {
      const validTypes = ['hotel', 'transfer', 'activity', 'sightseeing', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        });
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (destination !== undefined) updateData.destination = destination;
    if (costType !== undefined) updateData.costType = costType;
    if (baseCost !== undefined) updateData.baseCost = parseFloat(baseCost);
    if (currency !== undefined) updateData.currency = currency;
    if (validityStart !== undefined) updateData.validityStart = validityStart ? new Date(validityStart) : null;
    if (validityEnd !== undefined) updateData.validityEnd = validityEnd ? new Date(validityEnd) : null;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedBy = req.user?.id || null;
    
    const costItem = await CostItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!costItem) {
      return res.status(404).json({
        success: false,
        message: 'Cost item not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Cost item updated successfully',
      data: costItem,
    });
  } catch (error) {
    console.error('Error updating cost item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cost item',
      error: error.message,
    });
  }
};

// Delete a cost item (soft delete)
export const deleteCostItem = async (req, res) => {
  try {
    const costItem = await CostItem.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedBy: req.user?.id || null,
      },
      { new: true }
    );
    
    if (!costItem) {
      return res.status(404).json({
        success: false,
        message: 'Cost item not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Cost item deleted successfully',
      data: costItem,
    });
  } catch (error) {
    console.error('Error deleting cost item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cost item',
      error: error.message,
    });
  }
};


