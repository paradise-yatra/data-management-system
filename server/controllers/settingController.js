import Setting from '../models/Setting.js';

// Get all settings
export const listSettings = async (req, res) => {
  try {
    const settings = await Setting.find().sort({ key: 1 }).lean();
    
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    console.error('Error listing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message,
    });
  }
};

// Get a single setting
export const getSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
      });
    }
    
    res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting',
      error: error.message,
    });
  }
};

// Create or update a setting
export const upsertSetting = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required',
      });
    }
    
    const setting = await Setting.findOneAndUpdate(
      { key },
      {
        key,
        value,
        description: description || '',
        updatedBy: req.user?.id || null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );
    
    res.json({
      success: true,
      message: 'Setting saved successfully',
      data: setting,
    });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save setting',
      error: error.message,
    });
  }
};

// Update default markup
export const updateDefaultMarkup = async (req, res) => {
  try {
    const { percentage } = req.body;
    
    if (percentage === undefined || percentage < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid markup percentage is required',
      });
    }
    
    const setting = await Setting.findOneAndUpdate(
      { key: 'default_markup_percentage' },
      {
        key: 'default_markup_percentage',
        value: parseFloat(percentage),
        description: 'Default markup percentage applied to itinerary subtotals',
        updatedBy: req.user?.id || null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );
    
    res.json({
      success: true,
      message: 'Default markup updated successfully',
      data: setting,
    });
  } catch (error) {
    console.error('Error updating default markup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default markup',
      error: error.message,
    });
  }
};



