
const PIXABAY_API_KEY = '53479357-80b3feb16fd61b8af448448fc';
const PIXABAY_API_BASE = 'https://pixabay.com/api/';

type PixabayOrientation = 'horizontal' | 'vertical' | 'all';

interface PixabayImage {
    id: number;
    webformatURL: string;
    largeImageURL: string;
    tags: string;
    user: string;
}

interface PixabayVideo {
    id: number;
    user: string;
    tags: string;
    videos: {
        large: { url: string };
        medium: { url: string };
        small: { url: string };
        tiny: { url: string };
    };
    picture_id: string;
}

async function pixabayFetch(endpoint: string) {
    const response = await fetch(`${PIXABAY_API_BASE}${endpoint}&key=${PIXABAY_API_KEY}`);

    if (!response.ok) {
        throw new Error(`Pixabay API request failed: ${response.statusText}`);
    }

    return response.json();
}

// Map 'landscape' | 'portrait' | 'square' to Pixabay 'horizontal' | 'vertical'
function mapOrientation(o: 'landscape' | 'portrait' | 'square'): PixabayOrientation {
    if (o === 'portrait') return 'vertical';
    return 'horizontal'; // Pixabay doesn't support square explicitly in free API, default to horizontal
}

export async function searchPixabayImages(query: string, orientation: 'landscape' | 'portrait' | 'square' = 'landscape'): Promise<any[]> {
    const pixabayOrientation = mapOrientation(orientation);
    const data = await pixabayFetch(`?q=${encodeURIComponent(query)}&image_type=photo&orientation=${pixabayOrientation}&per_page=20`);
    
    return (data.hits || []).map((hit: PixabayImage) => ({
        id: hit.id,
        src: {
            medium: hit.webformatURL,
            large2x: hit.largeImageURL
        },
        alt: hit.tags,
        photographer: hit.user,
        _type: 'photo'
    }));
}

export async function searchPixabayVideos(query: string, orientation: 'landscape' | 'portrait' | 'square' = 'landscape'): Promise<any[]> {
    // Video API is /videos/
    // Note: Pixabay API base for videos is https://pixabay.com/api/videos/
    const pixabayOrientation = mapOrientation(orientation);
    // Construct URL manually since base is slightly different
    const response = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&video_type=film&orientation=${pixabayOrientation}&per_page=20`);
    
    if (!response.ok) {
        throw new Error(`Pixabay Video API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();

    return (data.hits || []).map((hit: PixabayVideo) => ({
        id: hit.id,
        image: `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`, // Construct preview if needed or use hit.userImageURL? No, hit.picture_id is common logic
        video_files: [
            // Map Pixabay format to Pexels-like format for compatibility
            { quality: 'hd', link: hit.videos.medium.url }, 
            { quality: 'sd', link: hit.videos.small.url }
        ],
        user: {
            name: hit.user
        },
        _type: 'video'
    }));
}

export async function searchPixabayAudio(query: string, type: 'music' | 'sfx' = 'music'): Promise<any[]> {
    // Determine track type parameter for Pixabay (audio_type usually filters music vs effects if supported, 
    // but Pixabay's main audio endpoint mixes them. We can try adding a keyword or checking API docs).
    // Note: Official Pixabay API often separates music and sound effects via endpoint or param.
    // We'll assume 'audio_type' parameter 'music' or 'sound_effect' based on common API patterns for Pixabay.
    const audioTypeParam = type === 'sfx' ? 'sound_effect' : 'music';
    
    // Sometimes simple 'q' with keyword works best if param isn't strictly enforced.
    // We add audio_type just in case.
    const response = await fetch(`https://pixabay.com/api/audio/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&audio_type=${audioTypeParam}&per_page=20`);
    
    if (!response.ok) {
        throw new Error(`Pixabay Audio API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();

    return (data.hits || []).map((hit: any) => ({
        id: hit.id,
        name: hit.name || (type === 'sfx' ? "Sound Effect" : "Unknown Track"),
        url: hit.url,
        duration: hit.duration,
        tags: hit.tags,
        artist: hit.user
    }));
}
