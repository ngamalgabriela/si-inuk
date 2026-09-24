const IDENTITY_KEY = "si-inuk-lk3-identitas-legalitas";
const SERVICES_KEY = "si-inuk-lk3-layanan-pendampingan";
const FILE_DB_NAME = "si-inuk-lk3-files";
const FILE_STORE_NAME = "files";

export type Lk3IdentityData = {
  namaKetua: string;
  nomorKontak: string;
  email: string;
  statusLk3: string;
  nomorSk: string;
  tanggalSk: string;
  dokumenStrukturNama: string;
  dokumenSkNama: string;
};

export const defaultIdentityData: Lk3IdentityData = {
  namaKetua: "",
  nomorKontak: "",
  email: "",
  statusLk3: "Aktif",
  nomorSk: "",
  tanggalSk: "",
  dokumenStrukturNama: "",
  dokumenSkNama: "",
};

export function readLk3Data<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLk3Data<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(data));
}

export function getIdentityData(): Lk3IdentityData {
  return readLk3Data(IDENTITY_KEY, defaultIdentityData);
}

export function saveIdentityData(data: Lk3IdentityData): void {
  writeLk3Data(IDENTITY_KEY, data);
}

export function getServicesStorageKey(): string {
  return SERVICES_KEY;
}

function openFileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FILE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLk3File(slot: string, file: File): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;

  const database = await openFileDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE_NAME, "readwrite");
    transaction.objectStore(FILE_STORE_NAME).put(file, slot);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getLk3File(slot: string): Promise<File | Blob | undefined> {
  if (typeof window === "undefined" || !window.indexedDB) return undefined;

  const database = await openFileDatabase();
  const file = await new Promise<File | Blob | undefined>((resolve, reject) => {
    const request = database.transaction(FILE_STORE_NAME).objectStore(FILE_STORE_NAME).get(slot);
    request.onsuccess = () => resolve(request.result as File | Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return file;
}