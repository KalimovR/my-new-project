export function uuid(): string {
    // 1) Если randomUUID доступен — отлично
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  
    // 2) Если есть getRandomValues — генерируем UUID v4 корректно
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
  
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  
      const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  
    // 3) Последний fallback (без криптостойкости, но сайт не падает)
    return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  }
  