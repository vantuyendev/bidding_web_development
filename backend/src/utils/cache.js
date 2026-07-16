class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get an item from the cache.
   * If the item is expired, it is deleted and null is returned.
   * 
   * @param {string} key 
   * @returns {any} Cached value or null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set an item in the cache with an optional TTL.
   * 
   * @param {string} key 
   * @param {any} value 
   * @param {number|null} ttlMs Time to live in milliseconds
   */
  set(key, value, ttlMs = null) {
    const expiry = ttlMs ? Date.now() + ttlMs : null;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete an item from the cache.
   * 
   * @param {string} key 
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache.
   */
  clear() {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();
