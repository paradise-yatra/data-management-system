import { randomUUID } from 'crypto';
import LeadSyncOutbox from '../models/LeadSyncOutbox.js';
import LeadSyncDlq from '../models/LeadSyncDlq.js';
import LeadSyncLink from '../models/LeadSyncLink.js';
import PoolLead from '../models/PoolLead.js';
import PoolLeadComment from '../models/PoolLeadComment.js';
import PoolAssignment from '../models/PoolAssignment.js';
import TelecallerLead from '../models/TelecallerLead.js';
import TelecallerTrash from '../models/TelecallerTrash.js';
import { logLeadsPoolAction } from '../utils/leadsPoolActivityLogger.js';
import { logTelecallerAction } from '../utils/telecallerLogger.js';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 30 * 1000;

const SYNCABLE_FIELDS = [
    'leadName',
    'phone',
    'email',
    'source',
    'destination',
    'duration',
    'travelDate',
    'budget',
    'paxCount',
    'adults',
    'children',
    'status',
    'nextFollowUp',
    'remarks',
    'assignedTo',
    'assignedBy',
    'assignedAt',
    'dateAdded',
    'addedBy',
    'addedById',
    'updatedAt',
];

let isProcessingOutbox = false;

const getActor = (actor = {}) => ({
    _id: actor.userId || actor._id || null,
    name: actor.name || 'System',
    role: actor.role || 'System',
});

const pickLeadFields = (data = {}) => {
    const result = {};
    for (const key of SYNCABLE_FIELDS) {
        if (data[key] !== undefined) {
            result[key] = data[key];
        }
    }
    return result;
};

const parseDateValue = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const shouldApplyIncoming = (incomingUpdatedAt, existingUpdatedAt) => {
    const incoming = parseDateValue(incomingUpdatedAt);
    const existing = parseDateValue(existingUpdatedAt);
    if (!incoming) return true;
    if (!existing) return true;
    return incoming.getTime() >= existing.getTime();
};

const getISTDateTime = () => {
    const now = new Date();
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

    const [datePart, timePart] = istString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
};

const computeRetryDelay = (retryCount) => {
    const exponential = Math.min(6, retryCount);
    return BASE_RETRY_DELAY_MS * (2 ** exponential);
};

const upsertBidirectionalSyncLink = async ({
    sourceSystem,
    sourceLeadId,
    sourceUniqueId = null,
    targetSystem,
    targetLeadId,
    targetUniqueId = null,
    eventId = null,
}) => {
    const now = new Date();

    await LeadSyncLink.findOneAndUpdate(
        { sourceSystem, sourceLeadId, targetSystem },
        {
            $set: {
                sourceUniqueId,
                targetLeadId,
                targetUniqueId,
                syncState: 'active',
                lastSyncedAt: now,
                lastEventId: eventId,
            },
        },
        { upsert: true, new: true }
    );

    await LeadSyncLink.findOneAndUpdate(
        { sourceSystem: targetSystem, sourceLeadId: targetLeadId, targetSystem: sourceSystem },
        {
            $set: {
                sourceUniqueId: targetUniqueId,
                targetLeadId: sourceLeadId,
                targetUniqueId: sourceUniqueId,
                syncState: 'active',
                lastSyncedAt: now,
                lastEventId: eventId,
            },
        },
        { upsert: true, new: true }
    );
};

const findLinkedTargetId = async (sourceSystem, sourceLeadId, targetSystem) => {
    const link = await LeadSyncLink.findOne({ sourceSystem, sourceLeadId, targetSystem });
    return link?.targetLeadId || null;
};

const resolvePoolLeadFromTelecaller = async (sourceLeadId, sourceUniqueId) => {
    const linkedId = await findLinkedTargetId('telecaller', sourceLeadId, 'pool');
    if (linkedId) {
        const linkedLead = await PoolLead.findById(linkedId);
        if (linkedLead) return linkedLead;
    }

    if (sourceLeadId) {
        const byExternalId = await PoolLead.findOne({ 'externalRefs.telecallerLeadId': sourceLeadId });
        if (byExternalId) return byExternalId;
    }

    if (sourceUniqueId) {
        const byExternalUniqueId = await PoolLead.findOne({ 'externalRefs.telecallerUniqueId': sourceUniqueId });
        if (byExternalUniqueId) return byExternalUniqueId;
    }

    return null;
};

const resolveTelecallerLeadFromPool = async (sourceLeadId, sourceUniqueId) => {
    const linkedId = await findLinkedTargetId('pool', sourceLeadId, 'telecaller');
    if (linkedId) {
        const linkedLead = await TelecallerLead.findById(linkedId);
        if (linkedLead) return linkedLead;
    }

    if (sourceUniqueId) {
        const byUniqueId = await TelecallerLead.findOne({ uniqueId: sourceUniqueId });
        if (byUniqueId) return byUniqueId;
    }

    const poolLead = await PoolLead.findById(sourceLeadId);
    if (poolLead?.externalRefs?.telecallerLeadId) {
        const byExternalId = await TelecallerLead.findById(poolLead.externalRefs.telecallerLeadId);
        if (byExternalId) return byExternalId;
    }

    if (poolLead?.externalRefs?.telecallerUniqueId) {
        const byExternalUniqueId = await TelecallerLead.findOne({ uniqueId: poolLead.externalRefs.telecallerUniqueId });
        if (byExternalUniqueId) return byExternalUniqueId;
    }

    return null;
};

const applyCreateOrUpdateInPool = async (event, isCreate = false) => {
    const sourceLead = event.payload?.lead || {};
    const actor = getActor(event.actor);

    let poolLead = await resolvePoolLeadFromTelecaller(event.sourceLeadId, event.sourceUniqueId);

    const incomingUpdatedAt = sourceLead.updatedAt || event.payload?.updatedAt || event.createdAt;
    if (!isCreate && poolLead && !shouldApplyIncoming(incomingUpdatedAt, poolLead.updatedAt)) {
        return;
    }

    const fields = pickLeadFields(sourceLead);
    delete fields.updatedAt;

    const now = new Date();
    const nextData = {
        ...fields,
        dateAdded: fields.dateAdded || getISTDateTime(),
        status: fields.status || 'Hot',
        source: fields.source || 'Telecaller',
        externalRefs: {
            telecallerLeadId: event.sourceLeadId,
            telecallerUniqueId: event.sourceUniqueId || sourceLead.uniqueId || null,
        },
        syncMeta: {
            lastSyncedAt: now,
            lastSyncedFrom: 'telecaller',
            lastEventId: event.eventId,
        },
    };

    if (!poolLead) {
        poolLead = await PoolLead.create(nextData);
        await logLeadsPoolAction('SYNC', poolLead, actor, {
            direction: 'telecaller_to_pool',
            eventType: event.eventType,
            operation: 'create',
        });
    } else {
        Object.assign(poolLead, nextData);
        await poolLead.save();
        await logLeadsPoolAction('SYNC', poolLead, actor, {
            direction: 'telecaller_to_pool',
            eventType: event.eventType,
            operation: 'update',
        });
    }

    await upsertBidirectionalSyncLink({
        sourceSystem: 'telecaller',
        sourceLeadId: event.sourceLeadId,
        sourceUniqueId: event.sourceUniqueId || sourceLead.uniqueId || null,
        targetSystem: 'pool',
        targetLeadId: poolLead._id.toString(),
        targetUniqueId: poolLead.uniqueId || null,
        eventId: event.eventId,
    });
};

const applyCreateOrUpdateInTelecaller = async (event, isCreate = false) => {
    const sourceLead = event.payload?.lead || {};
    const actor = getActor(event.actor);

    let telecallerLead = await resolveTelecallerLeadFromPool(event.sourceLeadId, event.sourceUniqueId);

    const incomingUpdatedAt = sourceLead.updatedAt || event.payload?.updatedAt || event.createdAt;
    if (!isCreate && telecallerLead && !shouldApplyIncoming(incomingUpdatedAt, telecallerLead.updatedAt)) {
        return;
    }

    const fields = pickLeadFields(sourceLead);
    delete fields.updatedAt;

    const nextData = {
        ...fields,
        dateAdded: fields.dateAdded || getISTDateTime(),
        status: fields.status || 'Hot',
        source: fields.source || 'Leads Pool',
        addedBy: fields.addedBy || actor.name,
        addedById: fields.addedById || actor._id || null,
    };

    if (!telecallerLead) {
        telecallerLead = await TelecallerLead.create(nextData);
        await logTelecallerAction('CREATE', telecallerLead, { user: actor }, {
            direction: 'pool_to_telecaller',
            eventType: event.eventType,
            operation: 'create',
        });
    } else {
        Object.assign(telecallerLead, nextData);
        await telecallerLead.save();
        await logTelecallerAction('UPDATE', telecallerLead, { user: actor }, {
            direction: 'pool_to_telecaller',
            eventType: event.eventType,
            operation: 'update',
        });
    }

    await upsertBidirectionalSyncLink({
        sourceSystem: 'pool',
        sourceLeadId: event.sourceLeadId,
        sourceUniqueId: event.sourceUniqueId || sourceLead.uniqueId || null,
        targetSystem: 'telecaller',
        targetLeadId: telecallerLead._id.toString(),
        targetUniqueId: telecallerLead.uniqueId || null,
        eventId: event.eventId,
    });
};

const applyTransferInPool = async (event) => {
    const actor = getActor(event.actor);
    const poolLead = await resolvePoolLeadFromTelecaller(event.sourceLeadId, event.sourceUniqueId);
    if (!poolLead) return;

    if (!shouldApplyIncoming(event.payload?.updatedAt || event.createdAt, poolLead.updatedAt)) return;

    const previousAssignee = poolLead.assignedTo || null;
    poolLead.assignedTo = event.payload?.assignedTo || null;
    poolLead.assignedBy = event.payload?.assignedBy || actor._id || null;
    poolLead.assignedAt = event.payload?.assignedAt ? new Date(event.payload.assignedAt) : new Date();
    poolLead.syncMeta = {
        lastSyncedAt: new Date(),
        lastSyncedFrom: 'telecaller',
        lastEventId: event.eventId,
    };
    await poolLead.save();

    if (poolLead.assignedTo) {
        await PoolAssignment.create({
            leadId: poolLead._id,
            fromUser: previousAssignee,
            toUser: poolLead.assignedTo,
            assignedBy: poolLead.assignedBy || actor._id || poolLead.assignedTo,
            sourceSystem: 'telecaller',
        });
    }

    await logLeadsPoolAction('TRANSFER', poolLead, actor, {
        direction: 'telecaller_to_pool',
        from: event.payload?.from || null,
        to: event.payload?.to || null,
        synced: true,
    });
};

const applyTransferInTelecaller = async (event) => {
    const actor = getActor(event.actor);
    const telecallerLead = await resolveTelecallerLeadFromPool(event.sourceLeadId, event.sourceUniqueId);
    if (!telecallerLead) return;

    if (!shouldApplyIncoming(event.payload?.updatedAt || event.createdAt, telecallerLead.updatedAt)) return;

    telecallerLead.assignedTo = event.payload?.assignedTo || null;
    telecallerLead.assignedBy = event.payload?.assignedBy || actor._id || null;
    telecallerLead.assignedAt = event.payload?.assignedAt ? new Date(event.payload.assignedAt) : new Date();
    await telecallerLead.save();

    await logTelecallerAction('TRANSFER', telecallerLead, { user: actor }, {
        direction: 'pool_to_telecaller',
        from: event.payload?.from || null,
        to: event.payload?.to || null,
        synced: true,
    });
};

const applyCommentInPool = async (event) => {
    const actor = getActor(event.actor);
    const poolLead = await resolvePoolLeadFromTelecaller(event.sourceLeadId, event.sourceUniqueId);
    if (!poolLead) return;

    const incomingComment = event.payload?.comment || {};
    const externalCommentId = incomingComment.externalCommentId || `${event.sourceSystem}:${incomingComment.commentId || event.eventId}`;

    const exists = await PoolLeadComment.findOne({ externalCommentId });
    if (exists) return;

    const createdComment = await PoolLeadComment.create({
        leadId: poolLead._id,
        text: incomingComment.text || '',
        userId: incomingComment.userId || actor._id || null,
        userName: incomingComment.userName || actor.name,
        mentions: incomingComment.mentions || [],
        externalCommentId,
        sourceSystem: 'telecaller',
        sourceCommentId: incomingComment.commentId || null,
        createdAt: incomingComment.createdAt ? new Date(incomingComment.createdAt) : new Date(),
    });

    await logLeadsPoolAction('COMMENT', poolLead, actor, {
        direction: 'telecaller_to_pool',
        synced: true,
        commentId: createdComment._id,
    });
};

const applyCommentInTelecaller = async (event) => {
    const actor = getActor(event.actor);
    const telecallerLead = await resolveTelecallerLeadFromPool(event.sourceLeadId, event.sourceUniqueId);
    if (!telecallerLead) return;

    const incomingComment = event.payload?.comment || {};
    const externalCommentId = incomingComment.externalCommentId || `${event.sourceSystem}:${incomingComment.commentId || event.eventId}`;

    const exists = (telecallerLead.comments || []).some(
        c => c.externalCommentId && c.externalCommentId === externalCommentId
    );
    if (exists) return;

    telecallerLead.comments.push({
        text: incomingComment.text || '',
        userId: incomingComment.userId || actor._id || null,
        userName: incomingComment.userName || actor.name,
        mentions: incomingComment.mentions || [],
        externalCommentId,
        createdAt: incomingComment.createdAt ? new Date(incomingComment.createdAt) : new Date(),
    });
    await telecallerLead.save();

    await logTelecallerAction('UPDATE', telecallerLead, { user: actor }, {
        direction: 'pool_to_telecaller',
        syncedComment: true,
    });
};

const applyDeleteInPool = async (event) => {
    const actor = getActor(event.actor);
    const poolLead = await resolvePoolLeadFromTelecaller(event.sourceLeadId, event.sourceUniqueId);
    if (!poolLead) return;

    poolLead.isDeleted = true;
    poolLead.deletedAt = new Date();
    poolLead.deletedBy = actor._id || null;
    poolLead.syncMeta = {
        lastSyncedAt: new Date(),
        lastSyncedFrom: 'telecaller',
        lastEventId: event.eventId,
    };
    await poolLead.save();

    await logLeadsPoolAction('DELETE', poolLead, actor, {
        direction: 'telecaller_to_pool',
        synced: true,
    });
};

const applyDeleteInTelecaller = async (event) => {
    const actor = getActor(event.actor);
    const telecallerLead = await resolveTelecallerLeadFromPool(event.sourceLeadId, event.sourceUniqueId);
    if (!telecallerLead) return;

    await TelecallerTrash.create({
        originalId: telecallerLead._id,
        leadData: telecallerLead.toObject(),
        deletedBy: actor._id || null,
    });

    await TelecallerLead.findByIdAndDelete(telecallerLead._id);
    await logTelecallerAction('DELETE', telecallerLead, { user: actor }, {
        direction: 'pool_to_telecaller',
        synced: true,
    });
};

const applyRestoreInPool = async (event) => {
    const actor = getActor(event.actor);
    const poolLead = await resolvePoolLeadFromTelecaller(event.sourceLeadId, event.sourceUniqueId);
    if (!poolLead) return;

    poolLead.isDeleted = false;
    poolLead.deletedAt = null;
    poolLead.deletedBy = null;
    poolLead.syncMeta = {
        lastSyncedAt: new Date(),
        lastSyncedFrom: 'telecaller',
        lastEventId: event.eventId,
    };
    await poolLead.save();

    await logLeadsPoolAction('RESTORE', poolLead, actor, {
        direction: 'telecaller_to_pool',
        synced: true,
    });
};

const applyRestoreInTelecaller = async (event) => {
    const actor = getActor(event.actor);
    const telecallerLead = await resolveTelecallerLeadFromPool(event.sourceLeadId, event.sourceUniqueId);
    if (telecallerLead) return;

    const sourceLead = event.payload?.lead || {};
    const restored = await TelecallerLead.create({
        ...pickLeadFields(sourceLead),
        dateAdded: sourceLead.dateAdded || getISTDateTime(),
        source: sourceLead.source || 'Leads Pool',
        status: sourceLead.status || 'Hot',
        addedBy: sourceLead.addedBy || actor.name,
        addedById: sourceLead.addedById || actor._id || null,
    });

    await upsertBidirectionalSyncLink({
        sourceSystem: 'pool',
        sourceLeadId: event.sourceLeadId,
        sourceUniqueId: event.sourceUniqueId || sourceLead.uniqueId || null,
        targetSystem: 'telecaller',
        targetLeadId: restored._id.toString(),
        targetUniqueId: restored.uniqueId || null,
        eventId: event.eventId,
    });

    await logTelecallerAction('RESTORE', restored, { user: actor }, {
        direction: 'pool_to_telecaller',
        synced: true,
    });
};

const applyEvent = async (event) => {
    const direction = event.sourceSystem === 'telecaller' ? 'telecaller_to_pool' : 'pool_to_telecaller';

    switch (event.eventType) {
        case 'lead.created':
            if (direction === 'telecaller_to_pool') {
                await applyCreateOrUpdateInPool(event, true);
            } else {
                await applyCreateOrUpdateInTelecaller(event, true);
            }
            break;
        case 'lead.updated':
            if (direction === 'telecaller_to_pool') {
                await applyCreateOrUpdateInPool(event, false);
            } else {
                await applyCreateOrUpdateInTelecaller(event, false);
            }
            break;
        case 'lead.transferred':
            if (direction === 'telecaller_to_pool') {
                await applyTransferInPool(event);
            } else {
                await applyTransferInTelecaller(event);
            }
            break;
        case 'lead.commented':
            if (direction === 'telecaller_to_pool') {
                await applyCommentInPool(event);
            } else {
                await applyCommentInTelecaller(event);
            }
            break;
        case 'lead.deleted':
            if (direction === 'telecaller_to_pool') {
                await applyDeleteInPool(event);
            } else {
                await applyDeleteInTelecaller(event);
            }
            break;
        case 'lead.restored':
            if (direction === 'telecaller_to_pool') {
                await applyRestoreInPool(event);
            } else {
                await applyRestoreInTelecaller(event);
            }
            break;
        default:
            break;
    }
};

const markEventDead = async (event, error) => {
    const message = error?.message || String(error);
    await LeadSyncOutbox.findByIdAndUpdate(event._id, {
        $set: {
            status: 'dead',
            error: message,
            processedAt: new Date(),
            retryCount: event.retryCount + 1,
        },
    });

    await LeadSyncDlq.create({
        eventId: event.eventId,
        eventType: event.eventType,
        sourceSystem: event.sourceSystem,
        sourceLeadId: event.sourceLeadId,
        sourceUniqueId: event.sourceUniqueId || null,
        payload: event.payload || {},
        actor: event.actor || {},
        retryCount: event.retryCount + 1,
        error: message,
        errorHistory: [{ message }],
    });
};

const markEventFailed = async (event, error) => {
    const nextRetryCount = event.retryCount + 1;
    if (nextRetryCount >= MAX_RETRIES) {
        await markEventDead(event, error);
        return;
    }

    const delay = computeRetryDelay(nextRetryCount);
    const nextAttemptAt = new Date(Date.now() + delay);
    await LeadSyncOutbox.findByIdAndUpdate(event._id, {
        $set: {
            status: 'failed',
            error: error?.message || String(error),
            nextAttemptAt,
            retryCount: nextRetryCount,
        },
    });
};

export const enqueueLeadSyncEvent = async ({
    eventType,
    sourceSystem,
    sourceLeadId,
    sourceUniqueId = null,
    payload = {},
    actor = {},
}) => {
    const outboxEvent = await LeadSyncOutbox.create({
        eventId: randomUUID(),
        eventType,
        sourceSystem,
        sourceLeadId: sourceLeadId?.toString?.() || sourceLeadId,
        sourceUniqueId: sourceUniqueId || null,
        payload,
        actor: {
            userId: actor._id || actor.userId || null,
            name: actor.name || 'System',
            role: actor.role || 'System',
        },
        status: 'pending',
        nextAttemptAt: new Date(),
    });

    processLeadSyncOutbox({ limit: 10 }).catch((error) => {
        console.error('Outbox processor failed after enqueue:', error);
    });

    return outboxEvent;
};

export const processLeadSyncOutbox = async ({ limit = 25 } = {}) => {
    if (isProcessingOutbox) {
        return { skipped: true, reason: 'processor_already_running' };
    }

    isProcessingOutbox = true;

    try {
        const events = await LeadSyncOutbox.find({
            status: { $in: ['pending', 'failed'] },
            nextAttemptAt: { $lte: new Date() },
        })
            .sort({ createdAt: 1 })
            .limit(limit);

        let processed = 0;
        let failed = 0;

        for (const event of events) {
            const lock = await LeadSyncOutbox.updateOne(
                { _id: event._id, status: { $in: ['pending', 'failed'] } },
                { $set: { status: 'processing' } }
            );
            if (!lock.modifiedCount) continue;

            try {
                await applyEvent(event);
                await LeadSyncOutbox.findByIdAndUpdate(event._id, {
                    $set: {
                        status: 'completed',
                        processedAt: new Date(),
                        error: null,
                    },
                });
                processed++;
            } catch (error) {
                failed++;
                console.error(`Sync event failed (${event.eventId}):`, error);
                await markEventFailed(event, error);
            }
        }

        return {
            skipped: false,
            fetched: events.length,
            processed,
            failed,
        };
    } finally {
        isProcessingOutbox = false;
    }
};

