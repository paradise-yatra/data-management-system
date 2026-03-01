import '../env.js';
import mongoose from 'mongoose';
import TelecallerLead from '../models/TelecallerLead.js';
import { enqueueLeadSyncEvent, processLeadSyncOutbox } from '../services/leadSyncService.js';

const run = async () => {
    try {
        const telecallerLeads = await TelecallerLead.find().sort({ createdAt: 1 });
        console.log(`Found ${telecallerLeads.length} telecaller leads for backfill`);

        let enqueued = 0;
        for (const lead of telecallerLeads) {
            await enqueueLeadSyncEvent({
                eventType: 'lead.created',
                sourceSystem: 'telecaller',
                sourceLeadId: lead._id.toString(),
                sourceUniqueId: lead.uniqueId || null,
                payload: {
                    lead: lead.toObject(),
                    updatedAt: lead.updatedAt || new Date(),
                    backfill: true,
                },
                actor: { name: 'Backfill Script', role: 'System' },
            });
            enqueued++;
        }

        console.log(`Enqueued ${enqueued} sync events`);
        const result = await processLeadSyncOutbox({ limit: Math.max(25, enqueued) });
        console.log('Outbox process result:', result);
    } catch (error) {
        console.error('Backfill failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();

