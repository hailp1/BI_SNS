import pako from 'pako';

const IDB_NAME = 'cj_sns_cache_v1';
const IDB_STORE = 'enc_payloads';
const PAYLOAD_KEY_STORAGE = 'cj_payload_key';

export function setPayloadKeyHex(keyHex: string): void {
  if (!keyHex || keyHex.length !== 64) return;
  try {
    sessionStorage.setItem(PAYLOAD_KEY_STORAGE, keyHex);
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function getPayloadKeyHex(): string {
  try {
    return sessionStorage.getItem(PAYLOAD_KEY_STORAGE) || localStorage.getItem(PAYLOAD_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function clearPayloadKeyHex(): void {
  try {
    sessionStorage.removeItem(PAYLOAD_KEY_STORAGE);
    localStorage.removeItem(PAYLOAD_KEY_STORAGE);
  } catch {
    // Ignore storage errors
  }
}

function buildKeystreamTable(keyHexStr: string, ivBytes: Uint8Array): Uint8Array {
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(keyHexStr.substring(i * 2, i * 2 + 2), 16) & 0xff;
  }

  const sBox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    sBox[i] = i;
  }

  let j = 0;
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 256; i++) {
      j = (j + sBox[i] + keyBytes[i & 31] + ivBytes[i & 15]) & 0xff;
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
  return table;
}

export function decryptAndInflateEnc<T = unknown>(encBytes: Uint8Array, overrideKeyHex?: string): T {
  const keyHex = overrideKeyHex ?? getPayloadKeyHex();
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('Missing or invalid payload decryption key. Please re-login.');
  }
  if (encBytes.byteLength <= 16) {
    throw new Error('Corrupt encrypted payload: insufficient byte length.');
  }

  const ivBytes = encBytes.subarray(0, 16);
  const cipherBytes = encBytes.subarray(16);
  const table = buildKeystreamTable(keyHex, ivBytes);
  const len = cipherBytes.length;
  const decBytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    decBytes[i] = cipherBytes[i] ^ table[i & 65535] ^ ((i >>> 16) & 0xff);
  }

  const decompressed = pako.inflate(decBytes);
  const jsonStr = new TextDecoder('utf-8').decode(decompressed);
  return JSON.parse(jsonStr) as T;
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetEnc(propName: string): Promise<Uint8Array | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(propName);
      req.onsuccess = () => {
        const val = req.result;
        if (!val) return resolve(null);
        resolve(val instanceof Uint8Array ? val : new Uint8Array(val));
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPutEnc(propName: string, encBytes: Uint8Array): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(encBytes, propName);
  } catch {
    // Ignore IDB quota errors
  }
}

export async function clearPayloadIdbCache(): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
  } catch {
    // Ignore clear errors
  }
}

export async function fetchDecryptedPayload<T = unknown[]>(propName: string): Promise<T> {
  const cachedEnc = await idbGetEnc(propName);
  if (cachedEnc && cachedEnc.byteLength > 16) {
    try {
      return decryptAndInflateEnc<T>(cachedEnc);
    } catch {
      // Cache invalid or key rotated; fall through to network fetch
    }
  }

  const resp = await fetch(`/api/v1/data/${propName}.enc?v=${IDB_NAME}`, {
    credentials: 'include',
  });
  if (!resp.ok) {
    throw new Error(`Không thể tải dữ liệu ${propName} (${resp.status})`);
  }

  const buf = await resp.arrayBuffer();
  const encBytes = new Uint8Array(buf);
  const parsed = decryptAndInflateEnc<T>(encBytes);
  await idbPutEnc(propName, encBytes);
  return parsed;
}
