
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '53479357-80b3feb16fd61b8af448448fc';
const PIXABAY_API_BASE = 'https://pixabay.com/api/';

// NOTE: Visual search (Images/Videos) has been moved to Pexels (services/pexelsService.ts).
// Pixabay is retained ONLY for Audio search as Pexels does not support audio.

export async function searchPixabayAudio(query: string, type: 'music' | 'sfx' = 'music'): Promise<any[]> {
    try {
        const audioTypeParam = type === 'sfx' ? 'sound_effect' : 'music';
        // Sanitize query: limit length and remove special chars that might break the URL
        const safeQuery = query.substring(0, 100).replace(/[^\w\s,.-]/gi, '').trim(); 
        
        // Sometimes simple 'q' with keyword works best if param isn't strictly enforced.
        const url = `https://pixabay.com/api/audio/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(safeQuery)}&audio_type=${audioTypeParam}&per_page=20`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            // Attempt to read error text
            const errText = await response.text().catch(() => '');
            console.warn(`Pixabay Audio API Error (${response.status}):`, errText);
            // Don't throw here to avoid crashing UI components expecting arrays
            return [];
        }
        
        const data = await response.json();

        return (data.hits || []).map((hit: any) => ({
            id: hit.id,
            name: hit.name || (type === 'sfx' ? "Sound Effect" : "Unknown Track"),
            // Ensure we have a valid URL. Pixabay audio sometimes requires different property access
            url: hit.url || (hit.audio_file ? hit.audio_file.url : ''),
            duration: hit.duration,
            tags: hit.tags,
            artist: hit.user
        })).filter((track: any) => track.url); // Filter out any tracks missing URLs

    } catch (e) {
        console.error("Pixabay Audio Search Exception:", e);
        return [];
    }
}
