export class LruCache<K, V> {
  private readonly store = new Map<K, V>();
  constructor(private readonly limit: number) {}

  get(key: K): V | undefined {
    const value = this.store.get(key);
    if (value === undefined) return undefined;
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.limit) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, value);
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  has(key: K): boolean {
    return this.store.has(key);
  }
}
