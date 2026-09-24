"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { saveFileAttachment } from "../_lib/attachments";
import {
  getSessionSnapshot,
  subscribeSessionStorage,
} from "../_lib/persistence";

type StatusSarpras = "ADA" | "TIDAK ADA";

type SarprasItem = {
  id: string;
  judul: string;
  deskripsi: string;
  status?: StatusSarpras;
  file: File | null;
  fileName?: string;
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
    deskripsi: "Motor, mobil, atau alat transportasi lain yang dimiliki/digunakan LKS.",
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

  const updateStatus = (id: string, status: StatusSarpras) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              file: status === "TIDAK ADA" ? null : item.file,
              fileName: status === "TIDAK ADA" ? "" : item.fileName,
            }
          : item
      )
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
          : item
      )
    );
  };

  const buildData = async () => {
    const dokumentasiWajib = await Promise.all(
      items.slice(0, 3).map(async (item) => {
        if (item.file) {
          await saveFileAttachment("sarpras", `${item.id}_dokumen`, item.file);
        }

        return {
          item: item.id,
          nama: item.judul,
          file: item.file?.name || item.fileName || "",
        };
      }),
    );

    const sarprasData = await Promise.all(
      items.slice(3).map(async (item) => {
        if (item.status === "ADA" && item.file) {
          await saveFileAttachment("sarpras", `${item.id}_sarpras`, item.file);
        }

        return {
          item: item.id,
          nama: item.judul,
          status: item.status || "",
          file: item.status === "ADA" ? item.file?.name || item.fileName || "" : "",
        };
      }),
    );

    return {
      dokumentasi_wajib: dokumentasiWajib,
      sarpras: sarprasData,
    };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = await buildData();

    localStorage.setItem(
      "si-inuk-lks-sarpras",
      JSON.stringify(data)
    );

    alert("Data Sarpras berhasil disimpan sementara.");
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

    const data = await buildData();

    localStorage.setItem(
      "si-inuk-lks-sarpras",
      JSON.stringify(data)
    );

    router.push("/lks/daftar/tanda-daftar");
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
                      File tersimpan: <span className="font-medium">{item.fileName}</span>
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
                        onChange={() => updateStatus(item.id, "TIDAK ADA")}
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
                            e.target.files?.[0] || null
                          )
                        }
                        className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                      />
                      {item.fileName && (
                        <p className="mt-2 text-sm text-slate-600">
                          File tersimpan: <span className="font-medium">{item.fileName}</span>
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
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Simpan Data
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
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Lanjut ke Tanda Daftar Dinas
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
