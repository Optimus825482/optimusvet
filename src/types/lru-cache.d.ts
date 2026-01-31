declare module "lru-cache" {
  export interface LRUCacheOptions<K, V> {
    max?: number;
    ttl?: number;
    maxSize?: number;
    sizeCalculation?: (value: V, key: K) => number;
  }

  export default class LRUCache<K = any, V = any> {
    constructor(options: LRUCacheOptions<K, V>);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): boolean;
    clear(): void;
    has(key: K): boolean;
    readonly size: number;
    readonly max: number;
  }
}
