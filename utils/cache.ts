
export const VIDEO_CACHE_NAME = 'magistory-media-cache-v1';

export async function getCachedMediaUrl(url: string): Promise<string> {
  // Return original URL if Cache API is not supported
  if (!('caches' in window)) return url;

  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      console.log('Serving from cache:', url);
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    console.log('Fetching and caching:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    // Clone response to put in cache, as the response body can only be consumed once
    cache.put(url, response.clone());
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn('Caching failed, falling back to network url', error);
    return url;
  }
}

export async function clearMediaCache() {
    if ('caches' in window) {
        await caches.delete(VIDEO_CACHE_NAME);
    }
}
