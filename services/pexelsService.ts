
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

// --- MOCK DATA GENERATORS ---
const MOCK_VIDEOS = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
];

function getMockPhotos(query: string, count: number = 15): any[] {
    const seed = query.replace(/[^a-zA-Z0-9]/g, '') || 'random';
    return Array.from({ length: count }).map((_, i) => ({
        id: 999000 + i,
        src: {
            medium: `https://picsum.photos/seed/${seed}${i}/400/300`, // Thumbnail
            large2x: `https://picsum.photos/seed/${seed}${i}/1280/720`, // Full
            original: `https://picsum.photos/seed/${seed}${i}/1920/1080`
        },
        alt: `Mock image for ${query}`,
        photographer: "Mock Source",
        _type: 'image'
    }));
}

function getMockVideos(query: string, count: number = 10): any[] {
    const seed = query.replace(/[^a-zA-Z0-9]/g, '') || 'random';
    return Array.from({ length: count }).map((_, i) => ({
        id: 888000 + i,
        image: `https://picsum.photos/seed/${seed}-vid-${i}/400/300`, // Poster
        video_files: [{
            quality: 'hd',
            link: MOCK_VIDEOS[i % MOCK_VIDEOS.length],
            width: 1280,
            height: 720
        }],
        user: { name: "Mock Source" },
        _type: 'video'
    }));
}

async function pexelsFetch(endpoint: string) {
    if (!PEXELS_API_KEY || PEXELS_API_KEY.includes('YOUR_PEXELS_API_KEY')) {
        // Force error to trigger fallback
        throw new Error("Pexels API Key is not configured.");
    }

    const response = await fetch(`${PEXELS_API_BASE}${endpoint}`, {
        headers: {
            Authorization: PEXELS_API_KEY
        }
    });

    if (response.status === 429) {
        throw new Error("Pexels Rate Limit Exceeded");
    }

    if (!response.ok) {
        throw new Error(`Pexels API request failed: ${response.statusText}`);
    }

    return response.json();
}


export async function searchPexelsPhotos(query: string, orientation: PexelsOrientation = 'landscape'): Promise<any[]> {
    try {
        const safeQuery = query.substring(0, 100).trim();
        if (!safeQuery) return getMockPhotos('random');

        const data = await pexelsFetch(`/v1/search?query=${encodeURIComponent(safeQuery)}&per_page=20&orientation=${orientation}`);
        
        if (!data.photos || data.photos.length === 0) {
            console.warn("Pexels returned no photos, using mock data.");
            return getMockPhotos(query);
        }

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
        console.warn("Pexels Photo Search failed, switching to Mock Data:", e);
        return getMockPhotos(query);
    }
}

export async function searchPexelsVideos(query: string, orientation: PexelsOrientation = 'landscape'): Promise<any[]> {
    try {
        const safeQuery = query.substring(0, 100).trim();
        if (!safeQuery) return getMockVideos('random');

        const data = await pexelsFetch(`/videos/search?query=${encodeURIComponent(safeQuery)}&per_page=20&orientation=${orientation}`);
        
        if (!data.videos || data.videos.length === 0) {
             console.warn("Pexels returned no videos, using mock data.");
             return getMockVideos(query);
        }

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
        console.warn("Pexels Video Search failed, switching to Mock Data:", e);
        return getMockVideos(query);
    }
}
