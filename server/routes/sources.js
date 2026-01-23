import express from 'express';
import Source from '../models/Source.js';
import Identity from '../models/Identity.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { createLog } from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sources
router.get('/', async (req, res) => {
  try {
    const sources = await Source.find().sort({ name: 1 });
    const sourceNames = sources.map((source) => source.name);
    res.json(sourceNames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new source
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Source name is required' });
    }

    const trimmedName = name.trim();

    // Check if source already exists
    const existingSource = await Source.findOne({ name: trimmedName });
    if (existingSource) {
      return res.status(400).json({ error: 'Source already exists' });
    }

    const source = new Source({ name: trimmedName });
    await source.save();
    
    // Log the action
    await createLog('add_source', req, {
      sourceName: trimmedName,
    });
    
    res.status(201).json(source.name);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Source already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update sources (bulk operation - replace all)
router.put('/bulk', async (req, res) => {
  try {
    const { sources } = req.body;

    if (!Array.isArray(sources)) {
      return res.status(400).json({ error: 'Sources must be an array' });
    }

    // Remove duplicates and trim
    const uniqueSources = [...new Set(sources.map((s) => s.trim()).filter((s) => s))];

    // Get current sources
    const currentSources = await Source.find();
    const currentSourceNames = currentSources.map((s) => s.name);

    // Find sources that are being removed
    const sourcesToRemove = currentSourceNames.filter(
      (currentSource) => !uniqueSources.includes(currentSource)
    );

    // Check if any of the sources being removed are being used in identity records
    if (sourcesToRemove.length > 0) {
      const identitiesUsingRemovedSources = await Identity.find({
        source: { $in: sourcesToRemove },
      });

      if (identitiesUsingRemovedSources.length > 0) {
        const usedSources = [...new Set(identitiesUsingRemovedSources.map((id) => id.source))];
        return res.status(400).json({
          error: `Cannot delete source(s): ${usedSources.join(', ')}. They are being used in one or more identity records.`,
        });
      }
    }

    // Delete all existing sources
    await Source.deleteMany({});

    // Insert new sources
    const sourceDocs = uniqueSources.map((name) => ({ name }));
    if (sourceDocs.length > 0) {
      await Source.insertMany(sourceDocs);
    }

    res.json(uniqueSources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a source
router.delete('/:name', async (req, res) => {
  try {
    // Decode the source name from URL
    const name = decodeURIComponent(req.params.name);
    
    // Check if source exists
    const source = await Source.findOne({ name });
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Check if source is being used in any identity records
    const identitiesUsingSource = await Identity.findOne({ source: name });
    if (identitiesUsingSource) {
      return res.status(400).json({ 
        error: 'Cannot delete source. It is being used in one or more identity records.' 
      });
    }

    // Delete the source
    await Source.findOneAndDelete({ name });

    // Log the action
    await createLog('delete_source', req, {
      sourceName: name,
    });

    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

