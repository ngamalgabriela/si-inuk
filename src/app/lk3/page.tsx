"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  getIdentityData,
  saveIdentityData,
  saveLk3File,
  type Lk3IdentityData,
} from "./_lib/persistence";

export default function Lk3Page() {
  const router = useRouter();
  const [data, setData] = useState<Lk3IdentityData>(() => getIdentityData());

  const updateData = (field: keyof Lk3IdentityData, value: string) => {
    setData((current) => {
      const next = { ...current, [field]: value };
      saveIdentityData(next);
      return next;
    });
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    field: "dokumenStrukturNama" | "dokumenSkNama",
    slot: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await saveLk3File(slot, file);
    updateData(field, file.name);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data.dokumenStrukturNama || !data.dokumenSkNama) {
      alert("Dokumen Struktur/Kepengurusan dan Dokumen SK wajib diunggah.");
      return;
    }
    router.push("/lk3/layanan-pendampingan");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
              SI-INUK / LK3
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
              Identitas &amp; Legalitas LK3
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Lembaga Konsultasi Kesejahteraan Keluarga
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
                01
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Identitas LK3</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Informasi dasar penanggung jawab dan status kelembagaan LK3.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="nama-ketua" className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Ketua/Pimpinan
                </label>
                <input
                  id="nama-ketua"
                  name="namaKetua"
                  type="text"
                  required
                  value={data.namaKetua}
                  onChange={(event) => updateData("namaKetua", event.target.value)}
                  placeholder="Masukkan nama ketua atau pimpinan"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label htmlFor="nomor-kontak" className="mb-2 block text-sm font-medium text-slate-700">
                  Nomor Kontak
                </label>
                <input
                  id="nomor-kontak"
                  name="nomorKontak"
                  type="tel"
                  required
                  value={data.nomorKontak}
                  onChange={(event) => updateData("nomorKontak", event.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={data.email}
                  onChange={(event) => updateData("email", event.target.value)}
                  placeholder="nama@contoh.go.id"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label htmlFor="status-lk3" className="mb-2 block text-sm font-medium text-slate-700">
                  Status LK3
                </label>
                <select
                  id="status-lk3"
                  name="statusLk3"
                  value={data.statusLk3}
                  onChange={(event) => updateData("statusLk3", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                02
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Legalitas LK3</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Catat nomor dan tanggal SK, lalu unggah dokumen legalitas LK3.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="nomor-sk" className="mb-2 block text-sm font-medium text-slate-700">
                  Nomor SK
                </label>
                <input
                  id="nomor-sk"
                  name="nomorSk"
                  type="text"
                  required
                  value={data.nomorSk}
                  onChange={(event) => updateData("nomorSk", event.target.value)}
                  placeholder="Masukkan nomor SK"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="tanggal-sk" className="mb-2 block text-sm font-medium text-slate-700">
                  Tanggal SK
                </label>
                <input
                  id="tanggal-sk"
                  name="tanggalSk"
                  type="date"
                  required
                  value={data.tanggalSk}
                  onChange={(event) => updateData("tanggalSk", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="dokumen-struktur" className="mb-2 block text-sm font-medium text-slate-700">
                  Dokumen Struktur/Kepengurusan
                </label>
                <input
                  id="dokumen-struktur"
                  name="dokumenStruktur"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => handleFileChange(event, "dokumenStrukturNama", "identitas-struktur")}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {data.dokumenStrukturNama ? `Tersimpan: ${data.dokumenStrukturNama}` : "Format PDF."}
                </p>
              </div>

              <div>
                <label htmlFor="dokumen-sk" className="mb-2 block text-sm font-medium text-slate-700">
                  Dokumen SK
                </label>
                <input
                  id="dokumen-sk"
                  name="dokumenSk"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => handleFileChange(event, "dokumenSkNama", "identitas-sk")}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {data.dokumenSkNama ? `Tersimpan: ${data.dokumenSkNama}` : "Format PDF."}
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-2">
            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
            >
              Simpan &amp; Lanjut ke Layanan dan Pendampingan
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
