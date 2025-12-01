import express from 'express';
import cors from 'cors';
import { renderVideo } from './renderer.js';
import path from 'path';
import fs from 'fs';

const app = express();
// Use PORT env variable provided by the hosting platform (Railway/Render)
const PORT = process.env.PORT || 3001;

// Increase payload limit for Base64 assets
app.use(express.json({ limit: '500mb' }));
app.use(cors({
    origin: '*', // For MVP, allow all. In production, set to your Vercel frontend URL
    methods: ['POST', 'GET']
}));

// Ensure temp dir exists in the runtime environment
// Using process.cwd() is safer in Docker/Node environments than __dirname for this purpose
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.post('/render', async (req, res) => {
    try {
        console.log("Received render request:", req.body.title);
        const { title, segments, audioTracks, resolution } = req.body;

        if (!segments || segments.length === 0) {
            return res.status(400).json({ error: "No segments provided" });
        }

        const outputPath = await renderVideo({ title, segments, audioTracks, resolution });

        res.download(outputPath, `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`, (err) => {
            if (err) {
                console.error("Error sending file:", err);
            }
            // Clean up file after sending to save disk space
            fs.unlink(outputPath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting temp file:", unlinkErr);
            });
        });

    } catch (error: any) {
        console.error("Render failed:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

app.get('/', (req, res) => {
    res.send('Magistory Render Server is running with FFmpeg.');
});

app.listen(PORT, () => {
    console.log(`Render server running on port ${PORT}`);
});