import JSZip from "jszip";

const STORAGE_KEY = "si-inuk-lks-attachments";
const FILE_DB_NAME = "si-inuk-lks-attachments-db";
const FILE_STORE_NAME = "files";

export const ATTACHMENTS_KEY = STORAGE_KEY;

function openAttachmentDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("Browser tidak mendukung IndexedDB."));
      return;
    }

    const request = window.indexedDB.open(FILE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FILE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Gagal membuka database lampiran."));
  });
}

async function saveBlobToAttachmentStore(key: string, blob: Blob): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  const database = await openAttachmentDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE_NAME, "readwrite");
    transaction.objectStore(FILE_STORE_NAME).put(blob, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Gagal menyimpan lampiran."));
  });
  database.close();
}

export async function getAttachmentBlob(key: string): Promise<Blob | undefined> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return undefined;
  }

  const database = await openAttachmentDatabase();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(FILE_STORE_NAME).objectStore(FILE_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error("Gagal membaca lampiran."));
  });
  database.close();
  return file;
}

export function buildSafeFileName(value: string): string {
  const base = (value || "lks")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return base || "lks";
}

export function readAttachmentMap(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(
      ([, value]) => typeof value === "string" && value.length > 0 && !value.startsWith("data:"),
    ) as Array<[string, string]>;

    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function writeAttachmentMap(map: Record<string, string>): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = Object.fromEntries(
    Object.entries(map).filter(([, value]) => typeof value === "string" && value.length > 0 && !value.startsWith("data:")),
  );

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    const fallback = Object.fromEntries(Object.entries(normalized).slice(-20));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  }
}

export async function saveFileAttachment(prefix: string, fieldName: string, file: File): Promise<void> {
  const key = `${prefix}.${fieldName}`;
  const map = readAttachmentMap();
  map[key] = file.name || "lampiran.bin";
  writeAttachmentMap(map);

  if (typeof window !== "undefined" && window.indexedDB) {
    await saveBlobToAttachmentStore(key, file);
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("FileReader gagal menghasilkan data URL."));
    };

    reader.onerror = () => reject(reader.error ?? new Error("FileReader gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

export function fromDataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",");

  if (!header || !payload) {
    return new Blob([], { type: "application/octet-stream" });
  }

  const mimeMatch = header.match(/data:(.*?);base64/i);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function toArchivePath(sourceKey: string, currentPath: string, fileName: string): string {
  const cleaned = `${sourceKey}/${currentPath}/${fileName}`
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .replace(/(\/)+$/, "")
    .trim();

  return cleaned || fileName;
}

export function collectLksAttachmentEntries(source: unknown, sourceKey: string): Array<{ path: string; blob: Blob }> {
  const entries: Array<{ path: string; blob: Blob }> = [];

  const walk = (value: unknown, currentPath: string) => {
    if (value === null || value === undefined || value === "") return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, `${currentPath}/${index}`);
      });
      return;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;

      Object.entries(record).forEach(([key, nestedValue]) => {
        if (key.endsWith("_data") && typeof nestedValue === "string" && nestedValue.startsWith("data:")) {
          const sourceField = key.replace(/_data$/, "");
          const originalName = typeof record[sourceField] === "string" && record[sourceField]
            ? String(record[sourceField])
            : `${sourceField}.bin`;

          entries.push({
            path: toArchivePath(sourceKey, currentPath, originalName),
            blob: fromDataUrlToBlob(nestedValue),
          });
          return;
        }

        if (key.endsWith("_data")) {
          return;
        }

        walk(nestedValue, `${currentPath}/${key}`);
      });
      return;
    }

    if (typeof value === "string" && value.startsWith("data:")) {
      entries.push({
        path: toArchivePath(sourceKey, currentPath, `${currentPath.split("/").pop() || "attachment"}.bin`),
        blob: fromDataUrlToBlob(value),
      });
    }
  };

  walk(source, "");
  return entries;
}

export async function buildLksArchiveFromSession(lksName: string): Promise<Blob> {
  const zip = new JSZip();
  const safeName = buildSafeFileName(lksName || "lks");
  const seenPaths = new Set<string>();
  const entries: Array<{ path: string; blob: Blob }> = [];

  const attachmentMap = readAttachmentMap();
  for (const [key, fileName] of Object.entries(attachmentMap)) {
    const [section, ...fieldParts] = key.split(".");
    const fieldName = fieldParts.join(".") || "attachment.bin";
    const sanitizedName = buildSafeFileName(fileName || fieldName) || "attachment.bin";
    const path = `${section}/${sanitizedName}`;

    if (seenPaths.has(path)) continue;
    seenPaths.add(path);

    const blob = await getAttachmentBlob(key);
    if (blob) {
      entries.push({ path, blob });
    }
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith("si-inuk-lks-") || key === STORAGE_KEY) {
      continue;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const sectionEntries = collectLksAttachmentEntries(parsed, key.replace(/^si-inuk-lks-/, ""));

      sectionEntries.forEach((entry) => {
        if (seenPaths.has(entry.path)) return;
        seenPaths.add(entry.path);
        entries.push(entry);
      });
    } catch {
      // Ignore malformed session data.
    }
  }

  if (entries.length === 0) {
    zip.file(`${safeName}.txt`, "Tidak ada file unggahan yang tersimpan untuk LKS ini.");
    return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
  }

  entries.forEach((entry) => {
    zip.file(`${safeName}/${entry.path}`, entry.blob);
  });

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
}
