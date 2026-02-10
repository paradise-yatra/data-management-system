import { z } from 'zod';
import mongoose from 'mongoose';
import PlaceClosure from '../models/PlaceClosure.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const closureRangeSchema = z.object({
  startTime: z.string().regex(TIME_PATTERN),
  endTime: z.string().regex(TIME_PATTERN),
});

const createClosureSchema = z.object({
  placeId: z.string().min(1),
  date: z.string().min(1),
  reason: z.string().optional().default(''),
  isClosedFullDay: z.boolean().optional().default(true),
  closedRanges: z.array(closureRangeSchema).optional().default([]),
});

const updateClosureSchema = z
  .object({
    date: z.string().min(1).optional(),
    reason: z.string().optional(),
    isClosedFullDay: z.boolean().optional(),
    closedRanges: z.array(closureRangeSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be updated',
  });

function parseDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function listPlaceClosures(req, res) {
  try {
    const query = {};
    if (req.query.placeId && mongoose.Types.ObjectId.isValid(req.query.placeId)) {
      query.placeId = new mongoose.Types.ObjectId(req.query.placeId);
    }
    if (req.query.date) {
      const date = parseDateOrNull(req.query.date);
      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date value',
        });
      }
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const data = await PlaceClosure.find(query).sort({ date: 1, createdAt: -1 }).lean();
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list place closures',
      error: error.message,
    });
  }
}

export async function createPlaceClosure(req, res) {
  try {
    const parsed = createClosureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    if (!mongoose.Types.ObjectId.isValid(payload.placeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid placeId',
      });
    }

    const closureDate = parseDateOrNull(payload.date);
    if (!closureDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date value',
      });
    }

    const closure = await PlaceClosure.create({
      placeId: new mongoose.Types.ObjectId(payload.placeId),
      date: closureDate,
      reason: payload.reason,
      isClosedFullDay: payload.isClosedFullDay,
      closedRanges: payload.isClosedFullDay ? [] : payload.closedRanges,
      createdBy: req.user?._id || req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      data: closure,
      message: 'Place closure created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create place closure',
      error: error.message,
    });
  }
}

export async function updatePlaceClosure(req, res) {
  try {
    const parsed = updateClosureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const updates = { ...parsed.data };
    if (updates.date) {
      const closureDate = parseDateOrNull(updates.date);
      if (!closureDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date value',
        });
      }
      updates.date = closureDate;
    }

    if (updates.isClosedFullDay === true) {
      updates.closedRanges = [];
    }

    const closure = await PlaceClosure.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Place closure not found',
      });
    }

    return res.json({
      success: true,
      data: closure,
      message: 'Place closure updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update place closure',
      error: error.message,
    });
  }
}

export async function deletePlaceClosure(req, res) {
  try {
    const closure = await PlaceClosure.findByIdAndDelete(req.params.id);
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Place closure not found',
      });
    }

    return res.json({
      success: true,
      message: 'Place closure deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete place closure',
      error: error.message,
    });
  }
}

