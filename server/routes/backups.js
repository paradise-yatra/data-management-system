import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const execAsync = promisify(exec);
const fsPromises = fs.promises;

// Backup directory configuration
const BACKUP_DIR = '/root/Backups/Mongodb';

// Helper function to check if running on VPS (Linux)
const isVPS = process.platform === 'linux';

// Helper function to execute commands
const executeCommand = async (command) => {
    try {
        const { stdout, stderr } = await execAsync(command);
        return { success: true, output: stdout, error: stderr };
    } catch (error) {
        console.error('Command Error:', error.message);
        return { success: false, output: '', error: error.message };
    }
};

// GET /api/backups - List all backups
router.get('/', async (req, res) => {
    try {
        if (!isVPS) {
            // For local development, return mock data
            return res.json({
                backups: [],
                totalCount: 0,
                totalSize: '0 Bytes',
                totalSizeBytes: 0,
                message: 'Running locally - connect to VPS for actual backups'
            });
        }

        // Get list of backups with details
        const result = await executeCommand(
            `cd ${BACKUP_DIR} && ls -la backup_*.zip 2>/dev/null | awk '{print $5, $6, $7, $8, $9}'`
        );

        if (!result.success) {
            return res.status(500).json({ error: 'Failed to list backups', details: result.error });
        }

        const lines = result.output.trim().split('\n').filter(line => line.trim());
        const backups = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const sizeBytes = parseInt(parts[0]);
                const filename = parts[4];
                // Extract timestamp from filename: backup_YYYY-MM-DD_HH-MM.zip
                const match = filename.match(/backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.zip/);
                let createdAt = null;
                if (match) {
                    const date = match[1];
                    const time = match[2].replace('-', ':');
                    createdAt = new Date(`${date}T${time}:00Z`).toISOString();
                }

                return {
                    filename,
                    sizeBytes,
                    sizeFormatted: formatBytes(sizeBytes),
                    createdAt,
                    month: parts[1],
                    day: parts[2],
                    time: parts[3]
                };
            }
            return null;
        }).filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Get total size
        const totalBytes = backups.reduce((sum, b) => sum + b.sizeBytes, 0);

        res.json({
            backups,
            totalCount: backups.length,
            totalSize: formatBytes(totalBytes),
            totalSizeBytes: totalBytes
        });
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

// GET /api/backups/schedule - Get next scheduled backup time
router.get('/schedule', async (req, res) => {
    try {
        // Cron runs at 0 */6 * * * (every 6 hours: 0:00, 6:00, 12:00, 18:00)
        const now = new Date();
        const currentHour = now.getUTCHours();

        // Find next 6-hour mark
        const nextHour = Math.ceil((currentHour + 1) / 6) * 6;
        const nextBackup = new Date(now);

        if (nextHour >= 24) {
            // Next backup is tomorrow at 00:00
            nextBackup.setUTCDate(nextBackup.getUTCDate() + 1);
            nextBackup.setUTCHours(0, 0, 0, 0);
        } else {
            nextBackup.setUTCHours(nextHour, 0, 0, 0);
        }

        const timeUntilNext = nextBackup.getTime() - now.getTime();

        res.json({
            nextBackup: nextBackup.toISOString(),
            timeUntilNextMs: timeUntilNext,
            timeUntilNextFormatted: formatDuration(timeUntilNext),
            schedule: 'Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)'
        });
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});

// POST /api/backups/trigger - Trigger instant backup
router.post('/trigger', async (req, res) => {
    try {
        if (!isVPS) {
            return res.status(400).json({ error: 'Cannot trigger backup from local environment' });
        }

        res.json({ message: 'Backup started', status: 'running' });

        // Run backup in background (don't wait for it)
        executeCommand(`${BACKUP_DIR}/backup.sh`).then(result => {
            if (result.success) {
                console.log('Manual backup completed successfully');
            } else {
                console.error('Manual backup failed:', result.error);
            }
        });
    } catch (error) {
        console.error('Error triggering backup:', error);
        res.status(500).json({ error: 'Failed to trigger backup' });
    }
});

// DELETE /api/backups/:filename - Delete a specific backup
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Validate filename format to prevent path traversal
        if (!filename.match(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.zip$/)) {
            return res.status(400).json({ error: 'Invalid filename format' });
        }

        if (!isVPS) {
            return res.status(400).json({ error: 'Cannot delete backup from local environment' });
        }

        const filePath = path.join(BACKUP_DIR, filename);
        await fsPromises.unlink(filePath);

        res.json({ message: 'Backup deleted successfully', filename });
    } catch (error) {
        console.error('Error deleting backup:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Backup file not found' });
        }
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

// GET /api/backups/download/:filename - Download a backup file
router.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Validate filename format
        if (!filename.match(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.zip$/)) {
            return res.status(400).json({ error: 'Invalid filename format' });
        }

        if (!isVPS) {
            return res.status(400).json({ error: 'Cannot download backup from local environment' });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        // Check if file exists
        try {
            await fsPromises.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Backup file not found' });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ error: 'Failed to download backup' });
    }
});

// GET /api/backups/logs - Get recent backup logs
router.get('/logs', async (req, res) => {
    try {
        if (!isVPS) {
            return res.json({ logs: 'Running locally - no logs available', success: true });
        }

        const result = await executeCommand(`tail -50 ${BACKUP_DIR}/backup.log 2>/dev/null || echo "No logs available"`);

        res.json({
            logs: result.output,
            success: result.success
        });
    } catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format duration
function formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

export default router;
