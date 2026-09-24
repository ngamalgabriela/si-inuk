"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  getServicesStorageKey,
  readLk3Data,
  saveLk3File,
  writeLk3Data,
} from "../_lib/persistence";
import { kabupatenLk3, wilayahManggaraiBarat } from "../_lib/wilayah";

const jenisLayanan = [
  "Konsultasi",
  "Konseling",
  "Advokasi",
  "Rujukan",
  "Pendampingan",
  "Layanan lain yang sesuai fungsi LK3",
];

type Layanan = {
  id: number;
  jenis: string;
};

type Pendampingan = {
  id: number;
};

type WilayahPelayanan = {
  id: number;
  kecamatan: string;
  desa: string;
};

type ServicesStorage = {
  layanan: Layanan[];
  pendampingan: Pendampingan[];
  layananAktif: string;
  jenisLayananBaru: string;
  values: Record<string, string>;
  fileNames: Record<string, string>;
  wilayahPelayanan: WilayahPelayanan[];
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100";
const selectClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100";

export default function LayananPendampinganPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const initialSavedData = readLk3Data<ServicesStorage | null>(getServicesStorageKey(), null);
  const savedDataRef = useRef<ServicesStorage | null>(initialSavedData);
  const [layanan, setLayanan] = useState<Layanan[]>(() => initialSavedData?.layanan ?? []);
  const [pendampingan, setPendampingan] = useState<Pendampingan[]>(() => initialSavedData?.pendampingan ?? [{ id: 1 }]);
  const [jenisLayananBaru, setJenisLayananBaru] = useState(() => initialSavedData?.jenisLayananBaru ?? "");
  const [layananAktif, setLayananAktif] = useState(() => initialSavedData?.layananAktif ?? "Pendampingan");
  const [fileNames, setFileNames] = useState<Record<string, string>>(() => initialSavedData?.fileNames ?? {});
  const [wilayahPelayanan, setWilayahPelayanan] = useState<WilayahPelayanan[]>(() => initialSavedData?.wilayahPelayanan ?? []);
  const [kecamatanPelayanan, setKecamatanPelayanan] = useState("");
  const [desaPelayanan, setDesaPelayanan] = useState("");

  const getFormValues = () => {
    const values: Record<string, string> = {};
    const elements = formRef.current?.elements ?? [];

    Array.from(elements).forEach((element) => {
      const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (field.name && field.type !== "file") values[field.name] = field.value;
    });

    return values;
  };

  const persistForm = useCallback((nextFileNames = fileNames) => {
    writeLk3Data<ServicesStorage>(getServicesStorageKey(), {
      layanan,
      pendampingan,
      layananAktif,
      jenisLayananBaru,
      values: getFormValues(),
      fileNames: nextFileNames,
      wilayahPelayanan,
    });
  }, [fileNames, jenisLayananBaru, layanan, layananAktif, pendampingan, wilayahPelayanan]);

  useEffect(() => {
    if (!savedDataRef.current) {
      persistForm();
      return;
    }

    const saved = savedDataRef.current;
    savedDataRef.current = null;
    window.setTimeout(() => {
      Object.entries(saved.values).forEach(([name, value]) => {
        const field = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        if (field) field.value = value;
      });
    }, 0);
  }, [persistForm]);

  const pilihLayanan = (jenis: string) => {
    setJenisLayananBaru(jenis);
    setLayananAktif(jenis);
    window.setTimeout(() => {
      document.getElementById("form-pendampingan")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const tambahLayanan = () => {
    if (!jenisLayananBaru) return;

    setLayanan((data) => {
      if (data.some((item) => item.jenis === jenisLayananBaru)) return data;
      return [...data, { id: Date.now(), jenis: jenisLayananBaru }];
    });
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    slot: string,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    await Promise.all(
      files.map((file, index) =>
        saveLk3File(files.length === 1 ? slot : `${slot}-${index}`, file),
      ),
    );
    setFileNames((current) => {
      const next = { ...current, [slot]: files.map((file) => file.name).join(", ") };
      persistForm(next);
      return next;
    });
  };

  const hapusLayanan = (id: number) => {
    setLayanan((data) => data.filter((item) => item.id !== id));
  };

  const tambahWilayahPelayanan = () => {
    if (!kecamatanPelayanan || !desaPelayanan) return;
    setWilayahPelayanan((data) => {
      if (data.some((item) => item.kecamatan === kecamatanPelayanan && item.desa === desaPelayanan)) return data;
      return [...data, { id: Date.now(), kecamatan: kecamatanPelayanan, desa: desaPelayanan }];
    });
    setDesaPelayanan("");
  };

  const tambahPendampingan = () => {
    setPendampingan((data) => [...data, { id: Date.now() }]);
  };

  const hapusPendampingan = (id: number) => {
    setPendampingan((data) => {
      if (data.length === 1) return data;
      return data.filter((item) => item.id !== id);
    });
  };

  const simpanData = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    alert("Data layanan dan pendampingan berhasil disimpan.");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
              SI-INUK / LK3 / Tahap 2
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
              Layanan dan Pendampingan
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Catat jenis layanan LK3 dan pendampingan kasus secara berulang sesuai kegiatan lembaga.
            </p>
          </div>

          <Link
            href="/lk3"
            className="inline-flex w-fit rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Kembali ke Identitas &amp; Legalitas
          </Link>
        </div>

        <form ref={formRef} onInput={() => persistForm()} onSubmit={simpanData} className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
                01
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Layanan LK3</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tambahkan semua jenis layanan yang diberikan oleh LK3.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="jenis-layanan" className="mb-2 block text-sm font-medium text-slate-700">
                  Jenis Layanan LK3
                </label>
                <select
                  id="jenis-layanan"
                  name="jenisLayananBaru"
                  value={jenisLayananBaru}
                  onChange={(event) => pilihLayanan(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Pilih jenis layanan</option>
                  {jenisLayanan.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={tambahLayanan}
                className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                + Tambah Layanan
              </button>
            </div>

            {layanan.length > 0 ? (
              <div className="mt-5 space-y-3">
                {layanan.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      <span className="mr-2 font-bold text-violet-700">{index + 1}.</span>
                      {item.jenis}
                    </p>
                    <button
                      type="button"
                      onClick={() => hapusLayanan(item.id)}
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
                Belum ada layanan yang ditambahkan.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Wilayah pelayanan</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Wilayah Pelayanan LK3</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Kedudukan LK3 berada di Kabupaten {kabupatenLk3}. Kecamatan dan Desa/Kelurahan di bawah ini adalah wilayah pelayanan yang dapat ditambahkan lebih dari satu.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label htmlFor="kecamatan-pelayanan" className="mb-2 block text-sm font-medium text-slate-700">Kecamatan Pelayanan</label>
                <select id="kecamatan-pelayanan" value={kecamatanPelayanan} onChange={(event) => { setKecamatanPelayanan(event.target.value); setDesaPelayanan(""); }} className={selectClassName}>
                  <option value="">Pilih Kecamatan</option>
                  {Object.keys(wilayahManggaraiBarat).map((kecamatan) => <option key={kecamatan} value={kecamatan}>{kecamatan}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="desa-pelayanan" className="mb-2 block text-sm font-medium text-slate-700">Desa/Kelurahan Pelayanan</label>
                <select id="desa-pelayanan" value={desaPelayanan} onChange={(event) => setDesaPelayanan(event.target.value)} disabled={!kecamatanPelayanan} className={selectClassName}>
                  <option value="">{kecamatanPelayanan ? "Pilih Desa/Kelurahan" : "Pilih Kecamatan terlebih dahulu"}</option>
                  {kecamatanPelayanan && wilayahManggaraiBarat[kecamatanPelayanan].map((desa) => <option key={desa} value={desa}>{desa}</option>)}
                </select>
              </div>
              <button type="button" onClick={tambahWilayahPelayanan} disabled={!kecamatanPelayanan || !desaPelayanan} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">+ Tambah Wilayah</button>
            </div>

            {wilayahPelayanan.length > 0 ? <div className="mt-5 space-y-3">{wilayahPelayanan.map((item, index) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-sm text-slate-800"><span className="mr-2 font-bold text-blue-700">{index + 1}.</span>{item.kecamatan} — {item.desa}</p><button type="button" onClick={() => setWilayahPelayanan((data) => data.filter((wilayah) => wilayah.id !== item.id))} className="text-sm font-semibold text-red-600 hover:text-red-700">Hapus</button></div>)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">Belum ada wilayah pelayanan yang ditambahkan.</p>}
          </section>

          <section id="form-pendampingan" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  02
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {layananAktif === "Konseling"
                    ? "Form Konseling"
                    : layananAktif === "Pendampingan"
                      ? "Form Pendampingan Kasus LK3"
                      : `Form ${layananAktif || "Pendampingan Kasus LK3"}`}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Formulir layanan {layananAktif || "Pendampingan"} menggunakan format pencatatan yang sama dan dapat ditambahkan berkali-kali.
                </p>
              </div>
              <button
                type="button"
                onClick={tambahPendampingan}
                className="inline-flex w-fit rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                + Tambah Layanan dan Pendampingan
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {pendampingan.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      {layananAktif || "Pendampingan"} {index + 1}
                    </h3>
                    {pendampingan.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => hapusPendampingan(item.id)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor={`tahun-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Tahun/Periode
                      </label>
                      <input id={`tahun-${item.id}`} name={`tahun-${item.id}`} type="text" placeholder="Contoh: 2026 / Januari-Juni 2026" className={inputClassName} />
                    </div>

                    <div>
                      <label htmlFor={`tanggal-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Tanggal Mulai
                      </label>
                      <input id={`tanggal-${item.id}`} name={`tanggal-${item.id}`} type="date" className={inputClassName} />
                    </div>

                    <div>
                      <label htmlFor={`klasifikasi-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Jenis/Klasifikasi Permasalahan
                      </label>
                      <input id={`klasifikasi-${item.id}`} name={`klasifikasi-${item.id}`} type="text" placeholder="Tuliskan jenis atau klasifikasi permasalahan" className={inputClassName} />
                    </div>

                    <div>
                      <label htmlFor={`bentuk-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Bentuk Pendampingan
                      </label>
                      <input id={`bentuk-${item.id}`} name={`bentuk-${item.id}`} type="text" placeholder="Contoh: Konseling dan rujukan" className={inputClassName} />
                    </div>

                    <div>
                      <label htmlFor={`status-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Status Penanganan
                      </label>
                      <select id={`status-${item.id}`} name={`status-${item.id}`} defaultValue="Dalam proses" className={selectClassName}>
                        <option>Dalam proses</option>
                        <option>Selesai</option>
                        <option>Dirujuk</option>
                        <option>Ditutup</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`rujukan-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Rujukan Bila Ada
                      </label>
                      <input id={`rujukan-${item.id}`} name={`rujukan-${item.id}`} type="text" placeholder="Nama lembaga atau layanan rujukan" className={inputClassName} />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor={`hasil-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Hasil/Tindak Lanjut
                      </label>
                      <textarea id={`hasil-${item.id}`} name={`hasil-${item.id}`} rows={4} placeholder="Tuliskan hasil pendampingan dan rencana tindak lanjut" className={inputClassName} />
                    </div>

                    <div>
                      <label htmlFor={`laporan-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Laporan Pendampingan Kasus LK3
                      </label>
                      <input id={`laporan-${item.id}`} name={`laporan-${item.id}`} type="file" accept=".pdf,application/pdf" onChange={(event) => handleFileChange(event, `laporan-${item.id}`)} className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700" />
                      <p className="mt-2 text-xs text-slate-500">{fileNames[`laporan-${item.id}`] ? `Tersimpan: ${fileNames[`laporan-${item.id}`]}` : "Format PDF."}</p>
                    </div>

                    <div>
                      <label htmlFor={`dokumen-${item.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                        Dokumen Pendukung
                      </label>
                      <input id={`dokumen-${item.id}`} name={`dokumen-${item.id}`} type="file" multiple accept=".pdf,application/pdf,image/*" onChange={(event) => handleFileChange(event, `dokumen-${item.id}`)} className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700" />
                      <p className="mt-2 text-xs text-slate-500">{fileNames[`dokumen-${item.id}`] ? `Tersimpan: ${fileNames[`dokumen-${item.id}`]}` : "PDF atau gambar pendukung."}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-2">
            <Link href="/lk3" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Kembali
            </Link>
            <button type="submit" className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800">
              Simpan Layanan dan Pendampingan
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
