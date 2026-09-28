"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { saveFileAttachment } from "../_lib/attachments";
import {
  getSessionSnapshot,
  subscribeSessionStorage,
  writeSessionData,
} from "../_lib/persistence";
import { getCurrentLksId } from "../_lib/registration";

type StatusSarpras = "ADA" | "TIDAK ADA";

type SarprasItem = {
  id: string;
  judul: string;
  deskripsi: string;
  status?: StatusSarpras;
  file: File | null;
  fileName?: string;
  storagePath?: string;
  storedFileName?: string;
};

const itemsAwal: SarprasItem[] = [
  {
    id: "tampak_depan",
    judul: "Foto Tampak Depan LKS",
    deskripsi: "Unggah 1 file PDF yang memuat foto tampak depan LKS.",
    file: null,
  },
  {
    id: "papan_nama",
    judul: "Foto Papan Nama LKS",
    deskripsi: "Unggah 1 file PDF yang memuat foto papan nama LKS.",
    file: null,
  },
  {
    id: "foto_pm",
    judul: "Foto PM",
    deskripsi: "Unggah 1 file PDF yang memuat foto PM.",
    file: null,
  },
  {
    id: "perkantoran",
    judul: "Perkantoran",
    deskripsi:
      "Ruang kerja, dapur, perlengkapan kantor, dan fasilitas perkantoran lainnya.",
    status: undefined,
    file: null,
  },
  {
    id: "ruang_layanan_teknis",
    judul: "Ruang Layanan Teknis",
    deskripsi:
      "Asrama, ruang konseling, dan ruang/fasilitas layanan teknis lainnya.",
    status: undefined,
    file: null,
  },
  {
    id: "ruang_penunjang",
    judul: "Ruang Penunjang LKS",
    deskripsi:
      "Alat komunikasi, instalasi listrik/air, dan fasilitas penunjang lainnya.",
    status: undefined,
    file: null,
  },
  {
    id: "alat_transportasi",
    judul: "Alat Transportasi",
    deskripsi:
      "Motor, mobil, atau alat transportasi lain yang dimiliki/digunakan LKS.",
    status: undefined,
    file: null,
  },
  {
    id: "aksesibilitas",
    judul: "Aksesibilitas",
    deskripsi:
      "Handrail, kursi roda, tongkat, dan fasilitas aksesibilitas lainnya.",
    status: undefined,
    file: null,
  },
];

export default function SarprasLksPage() {
  const router = useRouter();
  const lksId = getCurrentLksId();
  const isSaving = useRef(false);

  const [saving, setSaving] = useState(false);
  const [backendLoaded, setBackendLoaded] = useState(false);

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-sarpras"),
    () => "",
  );

  let savedData: {
    dokumentasi_wajib?: unknown;
    sarpras?: unknown;
  } = {};

  if (savedSnapshot) {
    try {
      savedData = JSON.parse(savedSnapshot) as typeof savedData;
    } catch {
      savedData = {};
    }
  }

  const savedDokumentasi = Array.isArray(savedData.dokumentasi_wajib)
    ? savedData.dokumentasi_wajib
    : [];

  const savedSarpras = Array.isArray(savedData.sarpras)
    ? savedData.sarpras
    : [];

  const [items, setItems] = useState<SarprasItem[]>(() => {
    return itemsAwal.map((item) => {
      const savedSource =
        item.id === "tampak_depan" ||
        item.id === "papan_nama" ||
        item.id === "foto_pm"
          ? savedDokumentasi
          : savedSarpras;

      const savedItem = savedSource.find((entry) => {
        if (!entry || typeof entry !== "object") return false;

        return (entry as Record<string, unknown>).item === item.id;
      });

      if (!savedItem || typeof savedItem !== "object") {
        return item;
      }

      const data = savedItem as Record<string, unknown>;

      return {
        ...item,
        status:
          typeof data.status === "string" &&
          (data.status === "ADA" || data.status === "TIDAK ADA")
            ? data.status
            : item.status,
        fileName: typeof data.file === "string" ? data.file : "",
        file: null,
      };
    });
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSarpras() {
      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const { data, error } = await createClient()
        .from("lks_sarpras")
        .select("item,nama,status,file_name,storage_path")
        .eq("lks_id", lksId);

      if (cancelled) return;

      if (error) {
        alert(`Gagal memuat data Sarpras dari Supabase: ${error.message}`);
      } else if (data) {
        const rows = new Map(data.map((row) => [row.item, row]));

        setItems((current) =>
          current.map((item) => {
            const row = rows.get(item.id);

            if (!row) return item;

            return {
              ...item,
              status:
                row.status === "ADA" || row.status === "TIDAK ADA"
                  ? row.status
                  : item.status,
              fileName: row.storage_path
                ? row.file_name || ""
                : item.fileName,
              storagePath: row.storage_path || undefined,
              storedFileName: row.file_name || undefined,
            };
          }),
        );
      }

      setBackendLoaded(true);
    }

    void loadSarpras();

    return () => {
      cancelled = true;
    };
  }, [lksId]);

  const updateStatus = (id: string, status: StatusSarpras) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              file: status === "TIDAK ADA" ? null : item.file,
              fileName: status === "TIDAK ADA" ? "" : item.fileName,
              storagePath:
                status === "TIDAK ADA" ? undefined : item.storagePath,
              storedFileName:
                status === "TIDAK ADA" ? undefined : item.storedFileName,
            }
          : item,
      ),
    );
  };

  const updateFile = (id: string, file: File | null) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              file,
              fileName: file?.name || item.fileName || "",
            }
          : item,
      ),
    );
  };

  const persistSarpras = async () => {
    if (isSaving.current) return false;

    if (!lksId) {
      alert("ID LKS belum tersedia. Simpan Identitas LKS terlebih dahulu.");
      return false;
    }

    isSaving.current = true;
    setSaving(true);

    try {
      /*
       * Upload file baru terlebih dahulu.
       * Jika file sudah tersimpan dan tidak ada file baru yang dipilih,
       * gunakan storagePath yang sudah ada sehingga tidak upload ulang.
       */
      const processedItems = await Promise.all(
        items.map(async (item) => {
          if (item.status === "TIDAK ADA") {
            return {
              ...item,
              file: null,
              fileName: "",
              storagePath: undefined,
              storedFileName: undefined,
            };
          }

          if (!item.file) {
            return item;
          }

          const isNewFile =
            !item.storagePath || item.storedFileName !== item.file.name;

          if (!isNewFile) {
            return item;
          }

          const isDocumentation =
            item.id === "tampak_depan" ||
            item.id === "papan_nama" ||
            item.id === "foto_pm";

          const storagePath = await saveFileAttachment(
            "sarpras",
            isDocumentation
              ? `${item.id}_dokumen`
              : `${item.id}_sarpras`,
            item.file,
          );

          return {
            ...item,
            fileName: item.file.name,
            storagePath,
            storedFileName: item.file.name,
          };
        }),
      );

      /*
       * Pastikan state React juga memiliki storagePath terbaru.
       * Ini penting agar Simpan Data kedua kali tidak meng-upload ulang.
       */
      setItems(processedItems);

      const dokumentasiWajib = processedItems
        .slice(0, 3)
        .map((item) => ({
          item: item.id,
          nama: item.judul,
          file: item.fileName || "",
          storagePath: item.storagePath || "",
        }));

      const sarprasData = processedItems
        .slice(3)
        .map((item) => ({
          item: item.id,
          nama: item.judul,
          status: item.status || "",
          file: item.status === "ADA" ? item.fileName || "" : "",
          storagePath:
            item.status === "ADA" ? item.storagePath || "" : "",
        }));

      /*
       * Validasi setelah proses upload.
       * Dokumentasi wajib harus mempunyai storagePath.
       * Sarpras dengan status ADA juga harus mempunyai storagePath.
       */
      const missingDocumentation = processedItems
        .slice(0, 3)
        .find((item) => !item.storagePath);

      if (missingDocumentation) {
        alert(
          "Data Sarpras belum dapat disimpan karena file dokumentasi wajib belum tersimpan di Supabase Storage.",
        );
        return false;
      }

      const missingSarprasFile = processedItems
        .slice(3)
        .find(
          (item) =>
            item.status === "ADA" && !item.storagePath,
        );

      if (missingSarprasFile) {
        alert(
          "Data Sarpras belum dapat disimpan karena file bukti Sarpras belum tersimpan di Supabase Storage.",
        );
        return false;
      }

      const localData = {
        dokumentasi_wajib: dokumentasiWajib,
        sarpras: sarprasData,
      };

      writeSessionData("si-inuk-lks-sarpras", localData);

      const rows = processedItems.map((item, index) => ({
        lks_id: lksId,
        item: item.id,
        nama: item.judul,
        status: index < 3 ? null : item.status || null,
        file_name: item.storagePath
          ? item.storedFileName || item.fileName || null
          : null,
        storage_path: item.storagePath || null,
      }));

      const { error } = await createClient()
        .from("lks_sarpras")
        .upsert(rows, { onConflict: "lks_id,item" });

      if (error) {
        alert(`Gagal menyimpan Sarpras ke Supabase: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak diketahui.";

      alert(`Gagal menyimpan Sarpras: ${message}`);
      return false;
    } finally {
      isSaving.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const saved = await persistSarpras();

    if (!saved) return;

    alert("Data Sarpras dan file dokumentasi berhasil tersimpan di Supabase.");
  };

  const handleNext = async () => {
    for (let i = 0; i < 3; i++) {
      const item = items[i];

      if (!item.file && !item.fileName) {
        alert(`${item.judul} wajib diunggah.`);
        return;
      }

      if (item.file && item.file.type !== "application/pdf") {
        alert(`${item.judul} harus menggunakan file PDF.`);
        return;
      }
    }

    for (let i = 3; i < items.length; i++) {
      const item = items[i];

      if (!item.status) {
        alert(`Status ${item.judul} belum dipilih.`);
        return;
      }

      if (item.status === "ADA" && !item.file && !item.fileName) {
        alert(`Bukti PDF untuk ${item.judul} wajib diunggah.`);
        return;
      }

      if (
        item.status === "ADA" &&
        item.file &&
        item.file.type !== "application/pdf"
      ) {
        alert(`Bukti ${item.judul} harus menggunakan file PDF.`);
        return;
      }
    }

    const saved = await persistSarpras();

    if (!saved) return;

    router.push("/lks/daftar/layanan");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">SI-INUK</p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — Sarana dan Prasarana
          </h1>

          <p className="mt-2 text-slate-600">
            Data sarana dan prasarana serta dokumentasi pendukung LKS.
          </p>
        </div>

        <form
          key={backendLoaded ? "backend-loaded" : "local-cache"}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Dokumentasi Wajib
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Setiap item menggunakan 1 file PDF. PDF dapat memuat beberapa
              foto yang relevan dengan item tersebut.
            </p>

            <div className="mt-5 space-y-5">
              {items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <label
                    htmlFor={item.id}
                    className="block text-sm font-semibold text-slate-800"
                  >
                    {item.judul}
                    <span className="ml-1 text-red-600">*</span>
                  </label>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.deskripsi}
                  </p>

                  <input
                    id={item.id}
                    type="file"
                    accept=".pdf,application/pdf"
                    required={!item.fileName}
                    onChange={(e) =>
                      updateFile(item.id, e.target.files?.[0] || null)
                    }
                    className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                  />

                  {item.fileName && (
                    <p className="mt-2 text-sm text-slate-600">
                      File tersimpan:{" "}
                      <span className="font-medium">{item.fileName}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Sarana dan Prasarana LKS
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Pilih status setiap komponen. Jika ADA, unggah 1 file PDF yang
              memuat foto-foto yang relevan dengan komponen tersebut.
            </p>

            <div className="mt-5 space-y-6">
              {items.slice(3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-5"
                >
                  <h3 className="text-base font-semibold text-slate-800">
                    {item.judul}
                    <span className="ml-1 text-red-600">*</span>
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.deskripsi}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={item.id}
                        value="ADA"
                        checked={item.status === "ADA"}
                        onChange={() => updateStatus(item.id, "ADA")}
                        required
                      />
                      ADA
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={item.id}
                        value="TIDAK ADA"
                        checked={item.status === "TIDAK ADA"}
                        onChange={() =>
                          updateStatus(item.id, "TIDAK ADA")
                        }
                      />
                      TIDAK ADA
                    </label>
                  </div>

                  {item.status === "ADA" && (
                    <div className="mt-4">
                      <label
                        htmlFor={`${item.id}-file`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Upload Bukti Foto
                        <span className="ml-1 text-red-600">*</span>
                      </label>

                      <input
                        id={`${item.id}-file`}
                        type="file"
                        accept=".pdf,application/pdf"
                        required={!item.fileName}
                        onChange={(e) =>
                          updateFile(
                            item.id,
                            e.target.files?.[0] || null,
                          )
                        }
                        className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                      />

                      {item.fileName && (
                        <p className="mt-2 text-sm text-slate-600">
                          File tersimpan:{" "}
                          <span className="font-medium">
                            {item.fileName}
                          </span>
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        1 file PDF. PDF dapat memuat beberapa foto yang
                        relevan.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              {saving ? "Menyimpan..." : "Simpan Data"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/lks/daftar/pm")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali ke PM
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              {saving ? "Menyimpan..." : "Lanjut ke Layanan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}