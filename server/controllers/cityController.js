import City from '../models/City.js';

// List all cities
export const listCities = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const cities = await City.find(query).sort({ name: 1 }).lean();
    
    res.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    console.error('Error listing cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: error.message,
    });
  }
};

// Get a single city
export const getCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }
    
    res.json({
      success: true,
      data: city,
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch city',
      error: error.message,
    });
  }
};

// Create a new city
export const createCity = async (req, res) => {
  try {
    const { name, country, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
      });
    }
    
    const city = new City({
      name,
      country: country || '',
      isActive: isActive !== undefined ? isActive : true,
    });
    
    await city.save();
    
    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: city,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A city with this name already exists',
      });
    }
    
    console.error('Error creating city:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create city',
      error: error.message,
    });
  }
};

// Update a city
export const updateCity = async (req, res) => {
  try {
    const { name, country, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (country !== undefined) updateData.country = country;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const city = await City.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }
    
    res.json({
      success: true,
      message: 'City updated successfully',
      data: city,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A city with this name already exists',
      });
    }
    
    console.error('Error updating city:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update city',
      error: error.message,
    });
  }
};

// Delete a city (soft delete)
export const deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }
    
    res.json({
      success: true,
      message: 'City deleted successfully',
      data: city,
    });
  } catch (error) {
    console.error('Error deleting city:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete city',
      error: error.message,
    });
  }
};



