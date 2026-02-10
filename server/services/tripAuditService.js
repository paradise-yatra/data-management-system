import TripVersion from '../models/TripVersion.js';
import LogicRunLog from '../models/LogicRunLog.js';

export async function createTripVersionSnapshot(tripDocument, options = {}) {
  if (!tripDocument?._id) {
    return null;
  }

  const latest = await TripVersion.findOne({ tripId: tripDocument._id })
    .sort({ version: -1 })
    .select('version')
    .lean();

  const version = (latest?.version || 0) + 1;

  const payload = {
    tripId: tripDocument._id,
    version,
    snapshot: tripDocument.toObject ? tripDocument.toObject() : tripDocument,
    reason: options.reason || 'UNSPECIFIED',
    createdBy: options.createdBy || null,
  };

  return TripVersion.create(payload);
}

export async function writeLogicRunLog(payload = {}) {
  const modelPayload = {
    tripId: payload.tripId || null,
    dayIndex: Number.isInteger(payload.dayIndex) ? payload.dayIndex : null,
    triggeredBy: payload.triggeredBy || null,
    triggerType: payload.triggerType || 'API_MANUAL',
    inputEventCount: Math.max(0, Number(payload.inputEventCount) || 0),
    outputEventCount: Math.max(0, Number(payload.outputEventCount) || 0),
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    errorMessages: Array.isArray(payload.errors) ? payload.errors : [],
    timingsMs: {
      validation: Math.max(0, Number(payload.timingsMs?.validate) || 0),
      route: Math.max(0, Number(payload.timingsMs?.route) || 0),
      schedule: Math.max(0, Number(payload.timingsMs?.schedule) || 0),
      total: Math.max(0, Number(payload.timingsMs?.total) || 0),
    },
  };

  return LogicRunLog.create(modelPayload);
}
