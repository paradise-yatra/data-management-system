import express from 'express';
import Identity from '../models/Identity.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { createLog } from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current date and time in Indian Standard Time (IST)
const getISTDateTime = () => {
  const now = new Date();

  // Get IST time using toLocaleString
  const istString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the IST string and format as ISO
  // Format: MM/DD/YYYY, HH:MM:SS
  const [datePart, timePart] = istString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
};

// Get all identities
router.get('/', async (req, res) => {
  try {
    const identities = await Identity.find().sort({ dateAdded: -1, createdAt: -1 });
    res.json(identities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single identity by ID
router.get('/:id', async (req, res) => {
  try {
    const identity = await Identity.findById(req.params.id);
    if (!identity) {
      return res.status(404).json({ error: 'Identity not found' });
    }
    res.json(identity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create identities
router.post('/bulk', async (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries array is required and must not be empty' });
    }

    const results = {
      success: [],
      failed: [],
    };

    // Get current date/time in IST for all entries
    const currentDateTime = getISTDateTime();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        const { name, email, phone, interests, source, remarks } = entry;

        // Validation
        if (!source || !source.trim()) {
          results.failed.push({
            index: i + 1,
            error: 'Source is required',
            data: entry,
          });
          continue;
        }

        const hasEmail = email && email.trim();
        const hasPhone = phone && phone.trim();
        if (!hasEmail && !hasPhone) {
          results.failed.push({
            index: i + 1,
            error: 'At least one of Email or Phone Number is required',
            data: entry,
          });
          continue;
        }

        const identityName = (name && typeof name === 'string' && name.trim()) ? name.trim() : '';
        const trimmedEmail = email?.trim() || '';
        const trimmedPhone = phone?.trim() || '';

        // Check for duplicate email
        if (trimmedEmail) {
          const existingEmail = await Identity.findOne({ email: trimmedEmail });
          if (existingEmail) {
            results.failed.push({
              index: i + 1,
              error: 'An entry with this email already exists',
              data: entry,
            });
            continue;
          }
        }

        // Check for duplicate phone
        if (trimmedPhone) {
          const existingPhone = await Identity.findOne({ phone: trimmedPhone });
          if (existingPhone) {
            results.failed.push({
              index: i + 1,
              error: 'An entry with this phone number already exists',
              data: entry,
            });
            continue;
          }
        }

        // Email format validation
        if (trimmedEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedEmail)) {
            results.failed.push({
              index: i + 1,
              error: 'Invalid email format',
              data: entry,
            });
            continue;
          }
        }

        // Create identity
        const identity = new Identity({
          name: identityName,
          email: trimmedEmail,
          phone: trimmedPhone,
          interests: Array.isArray(interests) ? interests : [],
          source: source.trim(),
          remarks: remarks?.trim() || '',
          dateAdded: currentDateTime,
        });

        await identity.save();
        const savedIdentity = await Identity.findById(identity._id);

        // Log the action
        await createLog('add_identity', req, {
          uniqueId: savedIdentity.uniqueId,
          name: savedIdentity.name || 'N/A',
          email: savedIdentity.email,
          phone: savedIdentity.phone,
        });

        results.success.push(savedIdentity);
      } catch (error) {
        results.failed.push({
          index: i + 1,
          error: error.message || 'Failed to create entry',
          data: entry,
        });
      }
    }

    res.status(201).json({
      message: `Created ${results.success.length} of ${entries.length} entries`,
      success: results.success.length,
      failed: results.failed.length,
      results,
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: error.message || 'Failed to create identities' });
  }
});

// Create a new identity
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, interests, source, remarks, dateAdded } = req.body;

    if (!source || !source.trim()) {
      return res.status(400).json({ error: 'Source is required' });
    }

    // At least one of email or phone must be provided
    const hasEmail = email && email.trim();
    const hasPhone = phone && phone.trim();
    if (!hasEmail && !hasPhone) {
      return res.status(400).json({ error: 'At least one of Email or Phone Number is required' });
    }

    // Ensure name is always a string (empty string if not provided)
    const identityName = (name && typeof name === 'string' && name.trim()) ? name.trim() : '';
    const trimmedEmail = email?.trim() || '';
    const trimmedPhone = phone?.trim() || '';

    // Check for duplicate email (if email is provided)
    if (trimmedEmail) {
      const existingEmail = await Identity.findOne({
        email: trimmedEmail,
        _id: { $ne: req.body._id } // Exclude current record if updating
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'An entry with this email already exists' });
      }
    }

    // Check for duplicate phone (if phone is provided)
    if (trimmedPhone) {
      const existingPhone = await Identity.findOne({
        phone: trimmedPhone,
        _id: { $ne: req.body._id } // Exclude current record if updating
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'An entry with this phone number already exists' });
      }
    }

    const identity = new Identity({
      name: identityName,
      email: trimmedEmail,
      phone: trimmedPhone,
      interests: Array.isArray(interests) ? interests : [],
      source: source.trim(),
      remarks: remarks?.trim() || '',
      dateAdded: dateAdded || getISTDateTime(),
    });

    await identity.save();
    // Ensure uniqueId is included in response
    const savedIdentity = await Identity.findById(identity._id);

    // Log the action
    await createLog('add_identity', req, {
      uniqueId: savedIdentity.uniqueId,
      name: savedIdentity.name || 'N/A',
      email: savedIdentity.email,
      phone: savedIdentity.phone,
    });

    res.status(201).json(savedIdentity);
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update an identity
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, interests, source, remarks, dateAdded } = req.body;

    if (!source || !source.trim()) {
      return res.status(400).json({ error: 'Source is required' });
    }

    // At least one of email or phone must be provided
    const hasEmail = email && email.trim();
    const hasPhone = phone && phone.trim();
    if (!hasEmail && !hasPhone) {
      return res.status(400).json({ error: 'At least one of Email or Phone Number is required' });
    }

    // Get the original identity for comparison
    const originalIdentity = await Identity.findById(req.params.id);
    if (!originalIdentity) {
      return res.status(404).json({ error: 'Identity not found' });
    }

    // Ensure name is always a string (empty string if not provided)
    const identityName = (name && typeof name === 'string' && name.trim()) ? name.trim() : '';

    const identity = await Identity.findById(req.params.id);
    if (!identity) {
      return res.status(404).json({ error: 'Identity not found' });
    }

    // Apply updates
    identity.name = identityName;
    identity.email = email?.trim() || '';
    identity.phone = phone?.trim() || '';
    identity.interests = Array.isArray(interests) ? interests : [];
    identity.source = source.trim();
    identity.remarks = remarks?.trim() || '';
    identity.dateAdded = dateAdded || getISTDateTime();
    identity.updatedAt = Date.now();

    await identity.save();

    // Track changed fields
    const changedFields = [];
    if (originalIdentity.name !== identityName) changedFields.push('name');
    if (originalIdentity.email !== (email?.trim() || '')) changedFields.push('email');
    if (originalIdentity.phone !== (phone?.trim() || '')) changedFields.push('phone');
    if (JSON.stringify(originalIdentity.interests) !== JSON.stringify(interests || [])) changedFields.push('interests');
    if (originalIdentity.source !== source.trim()) changedFields.push('source');
    if (originalIdentity.remarks !== (remarks?.trim() || '')) changedFields.push('remarks');

    // Log the action
    await createLog('edit_identity', req, {
      uniqueId: identity.uniqueId,
      name: identity.name || 'N/A',
      changedFields,
    });

    res.json(identity);
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete an identity
router.delete('/:id', async (req, res) => {
  try {
    const identity = await Identity.findByIdAndDelete(req.params.id);

    if (!identity) {
      return res.status(404).json({ error: 'Identity not found' });
    }

    // Log the action
    await createLog('delete_identity', req, {
      uniqueId: identity.uniqueId,
      name: identity.name || 'N/A',
      email: identity.email,
      phone: identity.phone,
    });

    res.json({ message: 'Identity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

