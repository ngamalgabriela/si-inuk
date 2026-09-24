"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { saveFileAttachment } from "../_lib/attachments";
import {
  getSessionSnapshot,
  subscribeSessionStorage,
} from "../_lib/persistence";

const tahunSaatIni = new Date().getFullYear();

type PmRecord = {
  id: number;
  tahun: string;
  perempuan: string;
  lakiLaki: string;
  bnba: File | null;
  bnbaFileName?: string;
};

type PembinaanRecord = {
  id: number;
  tahun: string;
  status: "YA" | "TIDAK_ADA";
  jenis: string;
};

type BantuanRecord = {
  id: number;
  tahun: string;
  status: "ADA" | "TIDAK_ADA";
  pemberi: string;
  jenis: string;
};

export default function PenerimaManfaatLksPage() {
  const router = useRouter();

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-pm"),
    () => "",
  );

  let savedData: {
    penerima_manfaat?: unknown;
    pembinaan?: unknown;
    bantuan?: unknown;
  } = {};

  if (savedSnapshot) {
    try {
      savedData = JSON.parse(savedSnapshot) as typeof savedData;
    } catch {
      savedData = {};
    }
  }

  const [pmRecords, setPmRecords] = useState<PmRecord[]>(() => {
    if (
      Array.isArray(savedData.penerima_manfaat) &&
      savedData.penerima_manfaat.length > 0
    ) {
      const records = savedData.penerima_manfaat
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;

          return {
            id: index + 1,
            tahun:
              typeof data.tahun_data === "string"
                ? data.tahun_data
                : String(tahunSaatIni),
            perempuan: String(data.pm_perempuan ?? ""),
            lakiLaki: String(data.pm_laki_laki ?? ""),
            bnba: null,
            bnbaFileName:
              typeof data.upload_bnba_pm === "string"
                ? data.upload_bnba_pm
                : "",
          } as PmRecord;
        })
        .filter((item): item is PmRecord => item !== null);

      if (records.length > 0) return records;
    }

    return [
      {
        id: 1,
        tahun: String(tahunSaatIni),
        perempuan: "",
        lakiLaki: "",
        bnba: null,
      },
    ];
  });

  const [pembinaanRecords, setPembinaanRecords] = useState<
    PembinaanRecord[]
  >(() => {
    if (
      Array.isArray(savedData.pembinaan) &&
      savedData.pembinaan.length > 0
    ) {
      const records = savedData.pembinaan
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;

          return {
            id: index + 1,
            tahun:
              typeof data.tahun === "string"
                ? data.tahun
                : String(tahunSaatIni),
            status: data.status === "YA" ? "YA" : "TIDAK_ADA",
            jenis:
              typeof data.jenis_kegiatan_pembinaan === "string"
                ? data.jenis_kegiatan_pembinaan
                : "",
          } as PembinaanRecord;
        })
        .filter((item): item is PembinaanRecord => item !== null);

      if (records.length > 0) return records;
    }

    return [
      {
        id: 1,
        tahun: String(tahunSaatIni),
        status: "TIDAK_ADA",
        jenis: "",
      },
    ];
  });

  const [bantuanRecords, setBantuanRecords] = useState<BantuanRecord[]>(
    () => {
      if (
        Array.isArray(savedData.bantuan) &&
        savedData.bantuan.length > 0
      ) {
        const records = savedData.bantuan
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const data = item as Record<string, unknown>;

            return {
              id: index + 1,
              tahun:
                typeof data.tahun === "string"
                  ? data.tahun
                  : String(tahunSaatIni),
              status: data.status === "ADA" ? "ADA" : "TIDAK_ADA",
              pemberi:
                typeof data.pemberi_bantuan === "string"
                  ? data.pemberi_bantuan
                  : "",
              jenis:
                typeof data.jenis_bantuan === "string"
                  ? data.jenis_bantuan
                  : "",
            } as BantuanRecord;
          })
          .filter((item): item is BantuanRecord => item !== null);

        if (records.length > 0) return records;
      }

      return [
        {
          id: 1,
          tahun: String(tahunSaatIni),
          status: "TIDAK_ADA",
          pemberi: "",
          jenis: "",
        },
      ];
    },
  );

  const savedPmRecords: PmRecord[] =
    Array.isArray(savedData.penerima_manfaat)
      ? savedData.penerima_manfaat
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const data = item as Record<string, unknown>;

            return {
              id: index + 1,
              tahun:
                typeof data.tahun_data === "string"
                  ? data.tahun_data
                  : String(tahunSaatIni),
              perempuan: String(data.pm_perempuan ?? ""),
              lakiLaki: String(data.pm_laki_laki ?? ""),
              bnba: null,
              bnbaFileName:
                typeof data.upload_bnba_pm === "string"
                  ? data.upload_bnba_pm
                  : "",
            } as PmRecord;
          })
          .filter((item): item is PmRecord => item !== null)
      : [];

  const savedPembinaanRecords: PembinaanRecord[] =
    Array.isArray(savedData.pembinaan)
      ? savedData.pembinaan
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const data = item as Record<string, unknown>;

            return {
              id: index + 1,
              tahun:
                typeof data.tahun === "string"
                  ? data.tahun
                  : String(tahunSaatIni),
              status: data.status === "YA" ? "YA" : "TIDAK_ADA",
              jenis:
                typeof data.jenis_kegiatan_pembinaan === "string"
                  ? data.jenis_kegiatan_pembinaan
                  : "",
            } as PembinaanRecord;
          })
          .filter((item): item is PembinaanRecord => item !== null)
      : [];

  const savedBantuanRecords: BantuanRecord[] =
    Array.isArray(savedData.bantuan)
      ? savedData.bantuan
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const data = item as Record<string, unknown>;

            return {
              id: index + 1,
              tahun:
                typeof data.tahun === "string"
                  ? data.tahun
                  : String(tahunSaatIni),
              status: data.status === "ADA" ? "ADA" : "TIDAK_ADA",
              pemberi:
                typeof data.pemberi_bantuan === "string"
                  ? data.pemberi_bantuan
                  : "",
              jenis:
                typeof data.jenis_bantuan === "string"
                  ? data.jenis_bantuan
                  : "",
            } as BantuanRecord;
          })
          .filter((item): item is BantuanRecord => item !== null)
      : [];

  const effectivePmRecords =
    savedPmRecords.length > 0 &&
    pmRecords.length === 1 &&
    !pmRecords[0].perempuan &&
    !pmRecords[0].lakiLaki &&
    !pmRecords[0].bnba &&
    !pmRecords[0].bnbaFileName
      ? savedPmRecords
      : pmRecords;

  const effectivePembinaanRecords =
    savedPembinaanRecords.length > 0 &&
    pembinaanRecords.length === 1 &&
    pembinaanRecords[0].status === "TIDAK_ADA" &&
    !pembinaanRecords[0].jenis
      ? savedPembinaanRecords
      : pembinaanRecords;

  const effectiveBantuanRecords =
    savedBantuanRecords.length > 0 &&
    bantuanRecords.length === 1 &&
    bantuanRecords[0].status === "TIDAK_ADA" &&
    !bantuanRecords[0].pemberi &&
    !bantuanRecords[0].jenis
      ? savedBantuanRecords
      : bantuanRecords;

  const jumlahPm = (record: PmRecord) =>
    (Number(record.perempuan) || 0) + (Number(record.lakiLaki) || 0);

  const buildPmData = async () => {
    const penerimaManfaat = await Promise.all(
      effectivePmRecords.map(async (record) => {
        if (record.bnba) {
          await saveFileAttachment("pm", `${record.id}_bnba`, record.bnba);
        }

        return {
          tahun_data: record.tahun,
          pm_perempuan: Number(record.perempuan) || 0,
          pm_laki_laki: Number(record.lakiLaki) || 0,
          jumlah_penerima_manfaat: jumlahPm(record),
          upload_bnba_pm: record.bnba?.name || record.bnbaFileName || "",
        };
      }),
    );

    return {
      penerima_manfaat: penerimaManfaat,
      pembinaan: effectivePembinaanRecords.map((record) => ({
        tahun: record.tahun,
        status: record.status,
        jenis_kegiatan_pembinaan:
          record.status === "YA" ? record.jenis : "",
      })),
      bantuan: effectiveBantuanRecords.map((record) => ({
        tahun: record.tahun,
        status: record.status,
        pemberi_bantuan: record.status === "ADA" ? record.pemberi : "",
        jenis_bantuan: record.status === "ADA" ? record.jenis : "",
      })),
    };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = await buildPmData();

    localStorage.setItem("si-inuk-lks-pm", JSON.stringify(data));

    alert(
      "Data Penerima Manfaat, Pembinaan, dan Bantuan LKS berhasil disimpan sementara.",
    );
  };

  const handleNext = async () => {
    for (let i = 0; i < effectivePmRecords.length; i++) {
      const record = effectivePmRecords[i];

      if (
        !record.tahun.trim() ||
        record.perempuan.trim() === "" ||
        record.lakiLaki.trim() === "" ||
        !record.bnba && !record.bnbaFileName
      ) {
        alert(`Data Penerima Manfaat ${i + 1} belum lengkap.`);
        return;
      }
    }

    for (let i = 0; i < effectivePembinaanRecords.length; i++) {
      const record = effectivePembinaanRecords[i];

      if (!record.tahun.trim() || !record.status) {
        alert(`Data Pembinaan ${i + 1} belum lengkap.`);
        return;
      }

      if (record.status === "YA" && !record.jenis.trim()) {
        alert(`Jenis Kegiatan Pembinaan ${i + 1} wajib diisi.`);
        return;
      }
    }

    for (let i = 0; i < effectiveBantuanRecords.length; i++) {
      const record = effectiveBantuanRecords[i];

      if (!record.tahun.trim() || !record.status) {
        alert(`Data Bantuan ${i + 1} belum lengkap.`);
        return;
      }

      if (record.status === "ADA") {
        if (!record.pemberi.trim()) {
          alert(`Pemberi Bantuan pada Bantuan ${i + 1} wajib diisi.`);
          return;
        }

        if (!record.jenis.trim()) {
          alert(`Jenis Bantuan pada Bantuan ${i + 1} wajib diisi.`);
          return;
        }
      }
    }

    const data = await buildPmData();

    localStorage.setItem("si-inuk-lks-pm", JSON.stringify(data));

    router.push("/lks/daftar/sarpras");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">SI-INUK</p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — Penerima Manfaat
          </h1>

          <p className="mt-2 text-slate-600">
            Pendataan Penerima Manfaat, Pembinaan, dan Bantuan LKS.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            5
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Penerima Manfaat (PM)
            </h2>

            <p className="text-sm text-slate-500">
              Data PM, pembinaan, dan bantuan LKS
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  A. Penerima Manfaat
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Data PM dapat dicatat lebih dari satu tahun.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPmRecords((records) => [
                    ...records,
                    {
                      id: Date.now(),
                      tahun: String(tahunSaatIni),
                      perempuan: "",
                      lakiLaki: "",
                      bnba: null,
                    },
                  ])
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Tambah Tahun Data
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {effectivePmRecords.map((record, index) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">
                      Data PM {index + 1}
                    </h3>

                    {effectivePmRecords.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPmRecords((records) =>
                            records.filter((item) => item.id !== record.id),
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`tahun-data-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Tahun Data
                      </label>

                      <input
                        id={`tahun-data-${record.id}`}
                        type="number"
                        min="2000"
                        max={tahunSaatIni}
                        value={record.tahun}
                        onChange={(e) =>
                          setPmRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? { ...item, tahun: e.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`pm-perempuan-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        PM Perempuan
                      </label>

                      <input
                        id={`pm-perempuan-${record.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={record.perempuan}
                        onChange={(e) =>
                          setPmRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? { ...item, perempuan: e.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`pm-laki-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        PM Laki-laki
                      </label>

                      <input
                        id={`pm-laki-${record.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={record.lakiLaki}
                        onChange={(e) =>
                          setPmRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? { ...item, lakiLaki: e.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`jumlah-pm-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Jumlah Penerima Manfaat
                      </label>

                      <input
                        id={`jumlah-pm-${record.id}`}
                        type="number"
                        value={jumlahPm(record)}
                        readOnly
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 outline-none"
                      />

                      <p className="mt-1 text-xs text-slate-500">
                        Dihitung otomatis: PM Perempuan + PM Laki-laki.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor={`bnba-pm-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Upload BNBA PM
                      </label>

                      <input
                        id={`bnba-pm-${record.id}`}
                        type="file"
                        accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        required={!record.bnbaFileName}
                        onChange={(e) =>
                          setPmRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? {
                                    ...item,
                                    bnba: e.target.files?.[0] || null,
                                    bnbaFileName: e.target.files?.[0]?.name || "",
                                  }
                                : item,
                            ),
                          )
                        }
                        className="mt-2 block w-full text-sm text-slate-700"
                      />

                      {record.bnbaFileName && (
                        <p className="mt-2 text-sm text-slate-600">
                          File tersimpan:{" "}
                          <span className="font-medium">{record.bnbaFileName}</span>
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        Format yang diperbolehkan: PDF dan Excel (.xls/.xlsx).
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  B. LKS Mendapat Pembinaan
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Satu LKS dapat memiliki lebih dari satu riwayat pembinaan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPembinaanRecords((records) => [
                    ...records,
                    {
                      id: Date.now(),
                      tahun: String(tahunSaatIni),
                      status: "TIDAK_ADA",
                      jenis: "",
                    },
                  ])
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Tambah Pembinaan
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {effectivePembinaanRecords.map((record, index) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">
                      Pembinaan {index + 1}
                    </h3>

                    {effectivePembinaanRecords.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPembinaanRecords((records) =>
                            records.filter((item) => item.id !== record.id),
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`pembinaan-tahun-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Tahun
                      </label>

                      <input
                        id={`pembinaan-tahun-${record.id}`}
                        type="number"
                        min="2000"
                        max={tahunSaatIni}
                        value={record.tahun}
                        onChange={(e) =>
                          setPembinaanRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? { ...item, tahun: e.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`pembinaan-status-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Status Pembinaan
                      </label>

                      <select
                        id={`pembinaan-status-${record.id}`}
                        value={record.status}
                        onChange={(e) =>
                          setPembinaanRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? {
                                    ...item,
                                    status: e.target.value as
                                      | "YA"
                                      | "TIDAK_ADA",
                                  }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="YA">Ya</option>
                        <option value="TIDAK_ADA">Tidak Ada</option>
                      </select>
                    </div>

                    {record.status === "YA" && (
                      <div className="md:col-span-2">
                        <label
                          htmlFor={`pembinaan-jenis-${record.id}`}
                          className="block text-sm font-medium text-slate-700"
                        >
                          Jenis Kegiatan Pembinaan
                        </label>

                        <input
                          id={`pembinaan-jenis-${record.id}`}
                          type="text"
                          value={record.jenis}
                          onChange={(e) =>
                            setPembinaanRecords((records) =>
                              records.map((item) =>
                                item.id === record.id
                                  ? { ...item, jenis: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          required
                          placeholder="Contoh: Pelatihan Manajemen LKS"
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  C. LKS Mendapat Bantuan
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Satu LKS dapat memiliki lebih dari satu riwayat bantuan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setBantuanRecords((records) => [
                    ...records,
                    {
                      id: Date.now(),
                      tahun: String(tahunSaatIni),
                      status: "TIDAK_ADA",
                      pemberi: "",
                      jenis: "",
                    },
                  ])
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Tambah Bantuan
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {effectiveBantuanRecords.map((record, index) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">
                      Bantuan {index + 1}
                    </h3>

                    {effectiveBantuanRecords.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setBantuanRecords((records) =>
                            records.filter((item) => item.id !== record.id),
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`bantuan-tahun-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Tahun
                      </label>

                      <input
                        id={`bantuan-tahun-${record.id}`}
                        type="number"
                        min="2000"
                        max={tahunSaatIni}
                        value={record.tahun}
                        onChange={(e) =>
                          setBantuanRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? { ...item, tahun: e.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`bantuan-status-${record.id}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        Status Bantuan
                      </label>

                      <select
                        id={`bantuan-status-${record.id}`}
                        value={record.status}
                        onChange={(e) =>
                          setBantuanRecords((records) =>
                            records.map((item) =>
                              item.id === record.id
                                ? {
                                    ...item,
                                    status: e.target.value as
                                      | "ADA"
                                      | "TIDAK_ADA",
                                  }
                                : item,
                            ),
                          )
                        }
                        required
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="ADA">Ada</option>
                        <option value="TIDAK_ADA">Tidak Ada</option>
                      </select>
                    </div>

                    {record.status === "ADA" && (
                      <>
                        <div>
                          <label
                            htmlFor={`pemberi-bantuan-${record.id}`}
                            className="block text-sm font-medium text-slate-700"
                          >
                            Pemberi Bantuan
                          </label>

                          <input
                            id={`pemberi-bantuan-${record.id}`}
                            type="text"
                            value={record.pemberi}
                            onChange={(e) =>
                              setBantuanRecords((records) =>
                                records.map((item) =>
                                  item.id === record.id
                                    ? {
                                        ...item,
                                        pemberi: e.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            required
                            placeholder="Diisi manual oleh LKS"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`jenis-bantuan-${record.id}`}
                            className="block text-sm font-medium text-slate-700"
                          >
                            Jenis Bantuan
                          </label>

                          <input
                            id={`jenis-bantuan-${record.id}`}
                            type="text"
                            value={record.jenis}
                            onChange={(e) =>
                              setBantuanRecords((records) =>
                                records.map((item) =>
                                  item.id === record.id
                                    ? {
                                        ...item,
                                        jenis: e.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            required
                            placeholder="Diisi manual oleh LKS"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-medium text-blue-900">Catatan Penting</p>

            <p className="mt-1 text-sm text-blue-800">
              Data Penerima Manfaat dicatat sebagai rekap per LKS per tahun.
              Data Pembinaan dan Bantuan dapat memiliki lebih dari satu
              riwayat.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800"
            >
              Simpan Data
            </button>

            <button
              type="button"
              onClick={() => router.push("/lks/daftar/layanan")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Layanan
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Lanjut ke Sarpras
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
