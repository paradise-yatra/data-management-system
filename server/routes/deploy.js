import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

/**
 * Trigger deployment for the Main Site.
 * Uses Server-Sent Events (SSE) to stream bash script logs in real-time.
 */
router.get('/main-site/stream', (req, res) => {
    // Requires authorization logic, currently guarded by global authenticateToken router level

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush headers to establish connection immediately

    // Safety check - we know the deploy script location
    const scriptPath = path.resolve(__dirname, '../scripts/deploy-main-site.sh');

    // Send initial log
    res.write(`data: ${JSON.stringify({ log: 'Connection established to deployment engine...' })}\n\n`);

    // Spawn the deployment bash script
    const process = spawn('bash', [scriptPath]);

    // Handle stdout data (normal logs)
    process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                res.write(`data: ${JSON.stringify({ log: line })}\n\n`);
            }
        });
    });

    // Handle stderr data (errors or warning logs)
    process.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                res.write(`data: ${JSON.stringify({ log: `[stderr]: ${line}` })}\n\n`);
            }
        });
    });

    // Handle process completion
    process.on('close', (code) => {
        if (code === 0) {
            res.write(`data: ${JSON.stringify({ status: 'success', log: 'Deployment script finished successfully.' })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ status: 'failed', log: `[ERROR] Deployment script exited with code ${code}.` })}\n\n`);
        }
        res.end();
    });

    // Handle unexpected errors preventing script from running
    process.on('error', (err) => {
        console.error('Failed to spawn deployment script:', err);
        res.write(`data: ${JSON.stringify({ status: 'failed', log: `[ERROR] Failed to start deployment process: ${err.message}` })}\n\n`);
        res.end();
    });

    // Cleanup if client disconnects early
    req.on('close', () => {
        console.log('Client closed deployment SSE connection early. Killing process.');
        process.kill();
    });
});

export default router;
