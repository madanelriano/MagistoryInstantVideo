
// This is a placeholder for your actual Pexels API key.
// In a real application, this should be stored securely and not hardcoded.
// For this environment, it's expected to be in process.env.
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'np1dGKKGGlLeT7JjklA5l8mspt3LhwLGtHXEBgnskJKfVFnNVXuAODDu';

const PEXELS_API_BASE = 'https://api.pexels.com';

type PexelsOrientation = 'landscape' | 'portrait' | 'square';

interface PexelsPhoto {
    id: number;
    src: {
        large2x: string;
        medium: string;
        original: string;
    };
    alt: string;
    photographer: string;
}

interface PexelsVideo {
    id: number;
    image: string; // poster image
    video_files: {
        quality: string; // 'hd', 'sd', 'uhd'
        link: string;
        width: number;
        height: number;
    }[];
    user: {
        name: string;
    }
}

async function pexelsFetch(endpoint: string) {
    if (!PEXELS_API_KEY || PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY_HERE') {
        console.error("Pexels API Key is not configured.");
        return { photos: [], videos: [] };
    }

    const response = await fetch(`${PEXELS_API_BASE}${endpoint}`, {
        headers: {
            Authorization: PEXELS_API_KEY
        }
    });

    if (!response.ok) {
        throw new Error(`Pexels API request failed: ${response.statusText}`);
    }

    return response.json();
}


export async function searchPexelsPhotos(query: string, orientation: PexelsOrientation = 'landscape'): Promise<any[]> {
    try {
        const safeQuery = query.substring(0, 100).trim();
        const data = await pexelsFetch(`/v1/search?query=${encodeURIComponent(safeQuery)}&per_page=20&orientation=${orientation}`);
        
        return (data.photos || []).map((photo: PexelsPhoto) => ({
            id: photo.id,
            src: {
                medium: photo.src.medium, // For thumbnail
                large2x: photo.src.large2x // For canvas
            },
            alt: photo.alt,
            photographer: photo.photographer,
            _type: 'image' // Normalized type for app
        }));
    } catch (e) {
        console.warn("Pexels Photo Search failed:", e);
        return [];
    }
}

export async function searchPexelsVideos(query: string, orientation: PexelsOrientation = 'landscape'): Promise<any[]> {
    try {
        const safeQuery = query.substring(0, 100).trim();
        const data = await pexelsFetch(`/videos/search?query=${encodeURIComponent(safeQuery)}&per_page=20&orientation=${orientation}`);
        
        return (data.videos || []).map((video: PexelsVideo) => ({
            id: video.id,
            image: video.image, 
            video_files: video.video_files.map(f => ({
                // Map Pexels qualities to our app's expected qualities
                quality: f.width >= 1280 ? 'hd' : (f.width < 640 ? 'tiny' : 'sd'),
                link: f.link,
                width: f.width,
                height: f.height
            })),
            user: {
                name: video.user.name
            },
            _type: 'video' // Normalized type for app
        }));
    } catch (e) {
        console.warn("Pexels Video Search failed:", e);
        return [];
    }
}
