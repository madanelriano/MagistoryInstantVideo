
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Buffer } from 'buffer';

const TEMP_DIR = path.join((process as any).cwd(), 'temp');
// Path font standar di Debian/Ubuntu (Docker Node Slim)
const FONT_PATH_DEJAVU = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

interface RenderJob {
    title: string;
    segments: any[];
    audioTracks: any[];
    resolution: { width: number; height: number };
}

async function saveAsset(url: string, jobId: string, type: 'image' | 'video' | 'audio'): Promise<string> {
    const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'mp3';
    const filename = `${uuidv4()}.${ext}`;
    const filePath = path.join(TEMP_DIR, jobId, filename);

    if (url.startsWith('data:')) {
        const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) throw new Error('Invalid input string');
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(filePath, buffer);
    } else {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', reject);
        });
    }
    return filePath;
}

// Generate Advanced Substation Alpha (.ass) subtitle file for perfect sync
function createASSFile(filePath: string, text: string, timings: any[], duration: number) {
    // Escape header values safely
    // ASS Header
    let content = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,42,&H00FFFFFF,&H000000FF,&H00000000,&H60000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Time formatter: Seconds -> H:MM:SS.cs
    const fmtTime = (seconds: number) => {
        const date = new Date(seconds * 1000);
        const iso = date.toISOString().substr(11, 11); // 00:00:00.00
        return iso.slice(0, -1); // 0:00:00.00
    };

    if (!timings || timings.length === 0) {
        // Fallback: one full line
        const end = fmtTime(duration);
        content += `Dialogue: 0,0:00:00.00,${end},Default,,0,0,0,,${text}\n`;
        fs.writeFileSync(filePath, content);
        return;
    }

    // Chunk timings into lines (approx 50 chars max per line)
    const MAX_CHARS = 50;
    let currentLine: any[] = [];
    let currentLen = 0;

    timings.forEach((t) => {
        if (currentLen + t.word.length > MAX_CHARS && currentLine.length > 0) {
             const start = fmtTime(currentLine[0].start);
             const end = fmtTime(currentLine[currentLine.length - 1].end);
             const lineText = currentLine.map(x => x.word).join(' ');
             content += `Dialogue: 0,${start},${end},Default,,0,0,0,,${lineText}\n`;
             currentLine = [];
             currentLen = 0;
        }
        currentLine.push(t);
        currentLen += t.word.length + 1;
    });

    if (currentLine.length > 0) {
        const start = fmtTime(currentLine[0].start);
        const end = fmtTime(currentLine[currentLine.length - 1].end);
        const lineText = currentLine.map(x => x.word).join(' ');
        content += `Dialogue: 0,${start},${end},Default,,0,0,0,,${lineText}\n`;
    }

    fs.writeFileSync(filePath, content);
}


export async function renderVideo(job: RenderJob): Promise<string> {
    const jobId = uuidv4();
    const jobDir = path.join(TEMP_DIR, jobId);
    
    if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
    }

    const outputPath = path.join(jobDir, 'output.mp4');
    const width = 1280;
    const height = 720;

    try {
        const segmentFiles: string[] = [];

        // 1. Process Segments
        for (let i = 0; i < job.segments.length; i++) {
            const seg = job.segments[i];
            const segOutputPath = path.join(jobDir, `seg_${i}.mp4`);
            
            // Download Narration Audio
            let audioPath = null;
            if (seg.audioUrl) {
                audioPath = await saveAsset(seg.audioUrl, jobId, 'audio');
            }

            // Process Visual Clips (Handle Multi-Clip with XFADE)
            const clipInputs: { path: string, type: string, duration: number }[] = [];
            const clipDuration = seg.duration / Math.max(1, seg.media.length);

            for (const clip of seg.media) {
                const clipPath = await saveAsset(clip.url, jobId, clip.type);
                clipInputs.push({ path: clipPath, type: clip.type, duration: clipDuration });
            }

            // Create Subtitle File (.ass)
            let assPath = '';
            if (seg.narration_text) {
                assPath = path.join(jobDir, `subs_${i}.ass`);
                createASSFile(assPath, seg.narration_text, seg.wordTimings, seg.duration);
            }

            await new Promise<void>((resolve, reject) => {
                const cmd = ffmpeg();
                
                // Add All Inputs
                clipInputs.forEach(c => {
                    cmd.input(c.path);
                    if (c.type === 'image') cmd.inputOptions(['-loop 1']);
                });

                if (audioPath) {
                    cmd.input(audioPath);
                } else {
                    // Silence filler
                    cmd.input('anullsrc=channel_layout=stereo:sample_rate=44100').inputFormat('lavfi');
                }

                const filters: string[] = [];
                const transitionDuration = 0.5; // 0.5s crossfade
                let videoStreamLabel = '';

                // === MULTI-CLIP VISUAL PIPELINE ===
                // 1. Scale & Setsar all inputs first
                clipInputs.forEach((c, idx) => {
                    // Scale to 720p, pad if needed, enforce SAR 1
                    // trim=duration helps restrict images (which loop infinitely) to specific duration
                    const label = `v${idx}`;
                    filters.push(`[${idx}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,trim=duration=${c.duration},setpts=PTS-STARTPTS[${label}]`);
                });

                // 2. Chain XFADE if multiple clips
                if (clipInputs.length > 1) {
                    let prevLabel = 'v0';
                    let currentOffset = clipInputs[0].duration;

                    for (let j = 1; j < clipInputs.length; j++) {
                        const nextLabel = `v${j}`;
                        const outLabel = `mix${j}`;
                        // Offset for xfade start = (accumulated time) - (transition duration)
                        // Note: xfade consumes the overlap, so visual duration shrinks.
                        // For simplicity in this auto-gen context, we assume simple dissolve.
                        const xfadeOffset = currentOffset - transitionDuration;
                        
                        filters.push(`[${prevLabel}][${nextLabel}]xfade=transition=fade:duration=${transitionDuration}:offset=${xfadeOffset}[${outLabel}]`);
                        
                        prevLabel = outLabel;
                        currentOffset += (clipInputs[j].duration - transitionDuration);
                    }
                    videoStreamLabel = prevLabel;
                } else {
                    videoStreamLabel = 'v0';
                }

                // 3. Apply Subtitles (if existing)
                if (assPath) {
                    // Escape path for windows/linux compatibility in filter string
                    // Note: In Docker Linux, forward slash is fine. 
                    // Need to escape colon in path (e.g. C:/) but usually fine in linux relative paths
                    const assFilterPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
                    filters.push(`[${videoStreamLabel}]subtitles=filename='${assFilterPath}'[vfinal]`);
                    videoStreamLabel = 'vfinal';
                }

                cmd.complexFilter(filters);

                cmd.outputOptions([
                    '-map', `[${videoStreamLabel}]`,
                    '-map', `${clipInputs.length}:a`, // Audio input is at index = length of clips
                    '-c:v', 'libx264',
                    '-preset', 'ultrafast', // Fast render
                    '-c:a', 'aac',
                    `-t`, `${seg.duration}` // Hard limit duration to match segment
                ]);

                cmd.save(segOutputPath)
                    .on('end', () => resolve())
                    .on('error', (err) => {
                        console.error(`Segment ${i} Render Error:`, err);
                        reject(err);
                    });
            });

            segmentFiles.push(segOutputPath);
        }

        // 2. Concat Segments
        const concatListPath = path.join(jobDir, 'concat_list.txt');
        const concatFileContent = segmentFiles.map(f => `file '${f}'`).join('\n');
        fs.writeFileSync(concatListPath, concatFileContent);

        const mergedVisualsPath = path.join(jobDir, 'merged_visuals.mp4');

        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(concatListPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions(['-c', 'copy'])
                .save(mergedVisualsPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error(`Error concat segments: ${err.message}`)));
        });

        // 3. Mix Background Audio
        const finalCmd = ffmpeg().input(mergedVisualsPath);
        let inputCount = 1;
        const audioMixInputs = ['[0:a]'];
        
        const complexFilters: string[] = [];

        for (const track of job.audioTracks) {
            const trackPath = await saveAsset(track.url, jobId, 'audio');
            finalCmd.input(trackPath);
            
            const delayMs = Math.round(track.startTime * 1000);
            const volume = track.volume || 0.8;
            
            complexFilters.push(`[${inputCount}:a]adelay=${delayMs}|${delayMs},volume=${volume}[a${inputCount}]`);
            audioMixInputs.push(`[a${inputCount}]`);
            inputCount++;
        }

        if (audioMixInputs.length > 1) {
            // Mix all audio tracks (narration + bg music + sfx)
            // duration=first ensures output matches video length
            complexFilters.push(`${audioMixInputs.join('')}amix=inputs=${audioMixInputs.length}:duration=first:dropout_transition=0[aout]`);
            finalCmd.outputOptions(['-map', '0:v', '-map', '[aout]']);
        } else {
             finalCmd.outputOptions(['-map', '0:v', '-map', '0:a']);
        }
        
        if (complexFilters.length > 0) {
            finalCmd.complexFilter(complexFilters);
        }

        finalCmd.outputOptions([
            '-c:v', 'copy', // Just copy video stream (saves re-encoding time)
            '-c:a', 'aac',
            '-shortest'
        ]);

        await new Promise<void>((resolve, reject) => {
            finalCmd
                .save(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error(`Error final render: ${err.message}`)));
        });
        
        return outputPath;

    } catch (e) {
        throw e;
    }
}
