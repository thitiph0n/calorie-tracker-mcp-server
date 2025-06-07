// Test setup file
import { vi } from 'vitest';

// Mock global crypto with subtle API for hashing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: vi.fn(async (algorithm, data) => {
        // Mock SHA-256 hash - return consistent but different ArrayBuffer based on input
        const mockHash = new ArrayBuffer(32);
        const view = new Uint8Array(mockHash);
        const input = new Uint8Array(data);
        
        // Create a simple hash based on input content
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
          hash = ((hash << 5) + hash + input[i]) & 0xffffffff;
        }
        
        for (let i = 0; i < view.length; i++) {
          view[i] = (hash + i) & 0xff;
        }
        return mockHash;
      }),
    },
  },
});

// Mock console methods to avoid noise in tests
Object.defineProperty(global, 'console', {
  value: {
    ...console,
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
});
