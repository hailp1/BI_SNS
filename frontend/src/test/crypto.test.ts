import pako from 'pako';
import { describe, expect, it } from 'vitest';
import { decryptAndInflateEnc } from '../shared/utils/crypto';

function encryptTestPayload(data: unknown, keyHex: string): Uint8Array {
  const iv = new Uint8Array(16);
  for (let i = 0; i < 16; i++) iv[i] = (i * 17) & 0xff;

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(keyHex.substring(i * 2, i * 2 + 2), 16) & 0xff;
  }

  const sBox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) sBox[i] = i;
  let j = 0;
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 256; i++) {
      j = (j + sBox[i] + keyBytes[i & 31] + iv[i & 15]) & 0xff;
      const tmp = sBox[i];
      sBox[i] = sBox[j];
      sBox[j] = tmp;
    }
  }
  const table = new Uint8Array(65536);
  let a = 0;
  let b = 0;
  for (let k = 0; k < 65536; k++) {
    a = (a + 1) & 0xff;
    b = (b + sBox[a]) & 0xff;
    const tmp = sBox[a];
    sBox[a] = sBox[b];
    sBox[b] = tmp;
    table[k] = sBox[(sBox[a] + sBox[b]) & 0xff];
  }

  const rawBytes = new TextEncoder().encode(JSON.stringify(data));
  const compressed = pako.deflate(rawBytes);
  const out = new Uint8Array(16 + compressed.length);
  out.set(iv, 0);
  for (let i = 0; i < compressed.length; i++) {
    out[16 + i] = compressed[i] ^ table[i & 65535] ^ ((i >>> 16) & 0xff);
  }
  return out;
}

describe('crypto utils', () => {
  const validKey = 'a'.repeat(64);

  it('decrypts and inflates XOR + zlib payloads matching backend format', () => {
    const sample = [{ channel: 'GT', sellin_val: 125000000 }];
    const enc = encryptTestPayload(sample, validKey);
    const decoded = decryptAndInflateEnc<typeof sample>(enc, validKey);
    expect(decoded).toEqual(sample);
  });

  it('throws when payload key is missing or wrong length', () => {
    const enc = encryptTestPayload({ ok: true }, validKey);
    expect(() => decryptAndInflateEnc(enc, 'short-key')).toThrow(/Missing or invalid payload decryption key/);
  });
});

