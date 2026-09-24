"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { saveFileAttachment } from "../_lib/attachments";
import { getSessionSnapshot } from "../_lib/persistence";

export default function TandaDaftarLksPage() {
  const router = useRouter();

  const getStatusPengajuan = (): "DRAFT" | "DIAJUKAN" => {
    if (typeof window === "undefined") {
      return "DRAFT";
    }

    try {
      const raw = getSessionSnapshot("si-inuk-lks-tanda-daftar");
      if (!raw) {
        return "DRAFT";
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed.status_pengajuan === "DIAJUKAN" ? "DIAJUKAN" : "DRAFT";
    } catch {
      return "DRAFT";
    }
  };

  const [statusPengajuan, setStatusPengajuan] = useState<"DRAFT" | "DIAJUKAN">(
    () => getStatusPengajuan()
  );

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const bacaData = (key: string): Record<string, unknown> | null => {
    if (!mounted) return null;

    const raw = getSessionSnapshot(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const identitas = bacaData("si-inuk-lks-identitas");
  const legalitas = bacaData("si-inuk-lks-legalitas");
  const sdm = bacaData("si-inuk-lks-sdm");
  const layanan = bacaData("si-inuk-lks-layanan");
  const pm = bacaData("si-inuk-lks-pm");
  const sarpras = bacaData("si-inuk-lks-sarpras");

  const bacaCakupanWilayah = (): { kecamatan: string; desa: string }[] => {
    if (typeof layanan?.cakupan_wilayah !== "string" || !layanan.cakupan_wilayah) {
      return [];
    }

    try {
      const data = JSON.parse(layanan.cakupan_wilayah) as unknown;

      if (!Array.isArray(data)) {
        return [];
      }

      return data.filter(
        (item): item is { kecamatan: string; desa: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { kecamatan?: unknown }).kecamatan === "string" &&
          typeof (item as { desa?: unknown }).desa === "string"
      );
    } catch {
      return [];
    }
  };

  const cakupanWilayah = bacaCakupanWilayah();

  const validasiAjukan = (form: HTMLFormElement) => {
    const suratPermohonan =
      form.elements.namedItem("surat_permohonan") as
        | HTMLInputElement
        | undefined;

    const fileSuratPermohonan = suratPermohonan?.files?.[0];

    if (!fileSuratPermohonan) {
      alert("Surat Permohonan Tanda Daftar Dinas wajib diunggah.");
      return false;
    }

    if (
      fileSuratPermohonan.type !== "application/pdf" &&
      !fileSuratPermohonan.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Surat Permohonan Tanda Daftar Dinas harus berformat PDF.");
      return false;
    }

    const kerjaSamaDinas =
      form.elements.namedItem("kerjasama_dinas") as
        | HTMLInputElement
        | undefined;

    const kerjaSamaFile = kerjaSamaDinas?.files?.[0];

    if (
      kerjaSamaFile &&
      kerjaSamaFile.type !== "application/pdf" &&
      !kerjaSamaFile.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("File Kerja Sama dengan Dinas harus berformat PDF.");
      return false;
    }

    return true;
  };

  const simpanTdd = async (status: "DRAFT" | "DIAJUKAN") => {
    const form = document.getElementById(
      "tdd-form"
    ) as HTMLFormElement | null;

    if (!form) return;

    if (status === "DIAJUKAN" && !validasiAjukan(form)) {
      return;
    }

    const formData = new FormData(form);
    const data: Record<string, string> = {};

    for (const [key, value] of Array.from(formData.entries())) {
      if (value instanceof File) {
        data[key] = value.name;
        if (value.size > 0) {
          await saveFileAttachment("tanda-daftar", key, value);
        }
      } else {
        data[key] = value;
      }
    }

    data.status_pengajuan = status;

    localStorage.setItem(
      "si-inuk-lks-tanda-daftar",
      JSON.stringify(data)
    );

    setStatusPengajuan(status);

    if (status === "DRAFT") {
      alert("Draft Tanda Daftar Dinas berhasil disimpan sementara.");
      return;
    }

    alert("Pengajuan Tanda Daftar Dinas berhasil diajukan.");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await simpanTdd("DIAJUKAN");
  };

  const handleSimpanDraft = async () => {
    await simpanTdd("DRAFT");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            SI-INUK
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — Tanda Daftar Dinas
          </h1>
          <p className="mt-2 text-slate-600">
            Pengajuan Tanda Daftar Dinas bagi Lembaga Kesejahteraan Sosial.
          </p>
        </div>

        <form id="tdd-form" onSubmit={handleSubmit} className="space-y-6">
          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Status Pengajuan
            </summary>

            <div className="mt-5">
              <label
                htmlFor="status_pengajuan"
                className="block text-sm font-medium text-slate-700"
              >
                Status Pengajuan
              </label>
              <input
                id="status_pengajuan"
                name="status_pengajuan"
                type="text"
                value={statusPengajuan}
                readOnly
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-600"
              />
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Ringkasan Identitas LKS
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Data berikut ditarik otomatis dari modul Identitas dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nama LKS
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.nama_lks === "string" ? identitas.nama_lks : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Kecamatan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.kecamatan === "string" ? identitas.kecamatan : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Desa/Kelurahan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.desa === "string" ? identitas.desa : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Alamat
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.alamat === "string" ? identitas.alamat : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Telepon
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.telepon === "string" ? identitas.telepon : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.email === "string" ? identitas.email : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status LKS
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.status_lks === "string" ? identitas.status_lks : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status Akreditasi
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof identitas?.status_akreditasi === "string" ? identitas.status_akreditasi : "Belum tersedia"}
                </p>
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Data Legalitas yang Sudah Tersedia
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Dokumen yang telah tersedia pada modul Legalitas tidak perlu
              diunggah kembali.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nomor Akta Pendirian
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof legalitas?.nomor_akta_pendirian === "string" ? legalitas.nomor_akta_pendirian : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tanggal Akta Pendirian
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof legalitas?.tanggal_akta_pendirian === "string" ? legalitas.tanggal_akta_pendirian : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status Badan Hukum
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof legalitas?.status_badan_hukum === "string" ? legalitas.status_badan_hukum : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nomor Pengesahan Kemenkumham
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof legalitas?.nomor_pengesahan_kemenkumham === "string" ? legalitas.nomor_pengesahan_kemenkumham : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  NPWP LKS
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof legalitas?.npwp_lks === "string" ? legalitas.npwp_lks : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Akta Pendirian / Akta Notaris
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {typeof legalitas?.akta_notaris === "string" && legalitas.akta_notaris
                    ? legalitas.akta_notaris
                    : "Dokumen belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  SK Pengesahan Kemenkumham
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {typeof legalitas?.sk_pengesahan_kemenkumham === "string" && legalitas.sk_pengesahan_kemenkumham
                    ? legalitas.sk_pengesahan_kemenkumham
                    : "Dokumen belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  AD/ART
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {typeof legalitas?.ad_art === "string" && legalitas.ad_art
                    ? legalitas.ad_art
                    : "Dokumen belum tersedia"}
                </p>
              </div>
            </div>

          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Data Pengurus
            </summary>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nama Ketua/Direktur/Kepala/Pimpinan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof sdm?.nama_pimpinan === "string" && sdm.nama_pimpinan
                    ? sdm.nama_pimpinan
                    : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof sdm?.email === "string" && sdm.email
                    ? sdm.email
                    : "Belum tersedia"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Data SDM / Struktur Kepengurusan LKS
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {typeof sdm?.data_sdm === "string" && sdm.data_sdm
                    ? sdm.data_sdm
                    : "Dokumen belum tersedia"}
                </p>
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Ringkasan Layanan
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Data berikut ditarik otomatis dari modul Layanan dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Jenis Pelayanan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {Array.isArray(layanan?.jenis_pelayanan)
                    ? layanan.jenis_pelayanan.join(", ")
                    : typeof layanan?.jenis_pelayanan === "string"
                      ? layanan.jenis_pelayanan
                      : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Sasaran Pelayanan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {Array.isArray(layanan?.sasaran_pelayanan)
                    ? layanan.sasaran_pelayanan.join(", ")
                    : typeof layanan?.sasaran_pelayanan === "string"
                      ? layanan.sasaran_pelayanan
                      : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Permasalahan Sosial
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {Array.isArray(layanan?.permasalahan_sosial)
                    ? layanan.permasalahan_sosial.join(", ")
                    : typeof layanan?.permasalahan_sosial === "string"
                      ? layanan.permasalahan_sosial
                      : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Sistem Pelayanan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {Array.isArray(layanan?.sistem_pelayanan)
                    ? layanan.sistem_pelayanan.join(", ")
                    : typeof layanan?.sistem_pelayanan === "string"
                      ? layanan.sistem_pelayanan
                      : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cakupan Wilayah Pelayanan
                </p>
                {cakupanWilayah.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {cakupanWilayah.map((wilayah, index) => (
                      <li
                        key={`${wilayah.kecamatan}-${wilayah.desa}-${index}`}
                        className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        <span className="font-medium text-slate-900">
                          {wilayah.kecamatan}
                        </span>
                        <span className="mx-2 text-slate-400">—</span>
                        <span>{wilayah.desa}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-700">
                    Belum tersedia
                  </p>
                )}
              </div>
            </div>
          </details>



          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Ringkasan Penerima Manfaat (PM)
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Data berikut ditarik otomatis dari modul Penerima Manfaat dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Penerima Manfaat
                </h3>
                {Array.isArray(pm?.penerima_manfaat) && pm.penerima_manfaat.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {pm.penerima_manfaat.map((record, index) => {
                      const data = record as Record<string, unknown>;
                      return (
                        <div
                          key={index}
                          className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                        >
                          <p>
                            <span className="font-medium text-slate-900">Tahun:</span>{" "}
                            {typeof data.tahun_data === "string" ? data.tahun_data : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Perempuan:</span>{" "}
                            {typeof data.pm_perempuan === "number" ? data.pm_perempuan : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Laki-laki:</span>{" "}
                            {typeof data.pm_laki_laki === "number" ? data.pm_laki_laki : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Jumlah Penerima Manfaat:</span>{" "}
                            {typeof data.jumlah_penerima_manfaat === "number"
                              ? data.jumlah_penerima_manfaat
                              : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">BNBA:</span>{" "}
                            {typeof data.upload_bnba_pm === "string" && data.upload_bnba_pm
                              ? data.upload_bnba_pm
                              : "Dokumen belum tersedia"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Belum tersedia</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pembinaan
                </h3>
                {Array.isArray(pm?.pembinaan) && pm.pembinaan.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {pm.pembinaan.map((record, index) => {
                      const data = record as Record<string, unknown>;
                      return (
                        <div
                          key={index}
                          className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                        >
                          <p>
                            <span className="font-medium text-slate-900">Tahun:</span>{" "}
                            {typeof data.tahun === "string" ? data.tahun : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Status:</span>{" "}
                            {typeof data.status === "string" ? data.status : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Jenis Kegiatan Pembinaan:</span>{" "}
                            {typeof data.jenis_kegiatan_pembinaan === "string" && data.jenis_kegiatan_pembinaan
                              ? data.jenis_kegiatan_pembinaan
                              : "Tidak ada"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Belum tersedia</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Bantuan
                </h3>
                {Array.isArray(pm?.bantuan) && pm.bantuan.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {pm.bantuan.map((record, index) => {
                      const data = record as Record<string, unknown>;
                      return (
                        <div
                          key={index}
                          className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                        >
                          <p>
                            <span className="font-medium text-slate-900">Tahun:</span>{" "}
                            {typeof data.tahun === "string" ? data.tahun : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Status:</span>{" "}
                            {typeof data.status === "string" ? data.status : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Pemberi Bantuan:</span>{" "}
                            {typeof data.pemberi_bantuan === "string" && data.pemberi_bantuan
                              ? data.pemberi_bantuan
                              : "Tidak ada"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Jenis Bantuan:</span>{" "}
                            {typeof data.jenis_bantuan === "string" && data.jenis_bantuan
                              ? data.jenis_bantuan
                              : "Tidak ada"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Belum tersedia</p>
                )}
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Ringkasan Sarana dan Prasarana
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Data berikut ditarik otomatis dari modul Sarana dan Prasarana dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Dokumentasi Wajib
                </h3>
                {Array.isArray(sarpras?.dokumentasi_wajib) && sarpras.dokumentasi_wajib.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {sarpras.dokumentasi_wajib.map((record, index) => {
                      const data = record as Record<string, unknown>;
                      return (
                        <div
                          key={index}
                          className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                        >
                          <p>
                            <span className="font-medium text-slate-900">Dokumentasi:</span>{" "}
                            {typeof data.nama === "string" ? data.nama : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">File:</span>{" "}
                            {typeof data.file === "string" && data.file
                              ? data.file
                              : "Dokumen belum tersedia"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Belum tersedia</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sarana dan Prasarana LKS
                </h3>
                {Array.isArray(sarpras?.sarpras) && sarpras.sarpras.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {sarpras.sarpras.map((record, index) => {
                      const data = record as Record<string, unknown>;
                      return (
                        <div
                          key={index}
                          className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                        >
                          <p>
                            <span className="font-medium text-slate-900">Komponen:</span>{" "}
                            {typeof data.nama === "string" ? data.nama : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">Status:</span>{" "}
                            {typeof data.status === "string" && data.status
                              ? data.status
                              : "Belum tersedia"}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-slate-900">File:</span>{" "}
                            {typeof data.file === "string" && data.file
                              ? data.file
                              : "Dokumen belum tersedia"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Belum tersedia</p>
                )}
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Dokumen Wajib Pengajuan
            </summary>

            <div className="mt-5">
              <label
                htmlFor="surat_permohonan"
                className="block text-sm font-medium text-slate-700"
              >
                Surat Permohonan Tanda Daftar Dinas
                <span className="ml-1 text-red-600">*</span>
              </label>
              <input
                id="surat_permohonan"
                name="surat_permohonan"
                type="file"
                accept=".pdf,application/pdf"
                required
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              />
              <p className="mt-1 text-xs text-slate-500">
                Wajib. Format yang diterima: PDF.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="kerjasama_dinas"
                className="block text-sm font-medium text-slate-700"
              >
                Upload Kerja Sama dengan Dinas
              </label>
              <input
                id="kerjasama_dinas"
                name="kerjasama_dinas"
                type="file"
                accept=".pdf,application/pdf"
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              />
              <p className="mt-1 text-xs text-slate-500">
                Opsional. Jika ada, format yang diterima: PDF. Jika belum ada, dapat dikosongkan.
              </p>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Dokumen Tambahan
            </summary>

            <div className="mt-5">
              <label
                htmlFor="surat_keterangan_domisili"
                className="block text-sm font-medium text-slate-700"
              >
                Surat Keterangan Domisili
              </label>
              <input
                id="surat_keterangan_domisili"
                name="surat_keterangan_domisili"
                type="file"
                accept=".pdf,application/pdf"
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              />
              <p className="mt-1 text-xs text-slate-500">
                Opsional. Jika diunggah, format yang diterima: PDF.
              </p>
            </div>
          </details>





          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/lks/daftar/sarpras")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Sarpras
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Ke Dashboard
            </button>

            <button
              type="button"
              onClick={handleSimpanDraft}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Simpan Draft
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Ajukan Tanda Daftar Dinas
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
