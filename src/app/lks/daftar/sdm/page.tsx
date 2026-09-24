"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { saveFileAttachment } from "../_lib/attachments";
import {
  getSessionSnapshot,
  readSessionData,
  subscribeSessionStorage,
  writeSessionData,
} from "../_lib/persistence";

export default function SdmLksPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-sdm"),
    () => ""
  );

  const savedData = savedSnapshot
    ? readSessionData<Record<string, string>>("si-inuk-lks-sdm", {})
    : {};

  const saveData = async (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const data: Record<string, string> = { ...savedData };

    for (const [key, value] of Array.from(formData.entries())) {
      if (value instanceof File) {
        data[key] = value.name;
        if (value.size > 0) {
          await saveFileAttachment("sdm", key, value);
        }
      } else {
        data[key] = value;
      }
    }

    writeSessionData("si-inuk-lks-sdm", data);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await saveData(e.currentTarget);

    alert("Data SDM LKS berhasil disimpan sementara.");
  };

  const handleNext = async () => {
    const form = document.getElementById(
      "sdm-form"
    ) as HTMLFormElement | null;

    if (!form) return;

    if (!form.reportValidity()) {
      return;
    }

    await saveData(form);

    router.push("/lks/daftar/layanan");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">SI-INUK</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — SDM
          </h1>
          <p className="mt-2 text-slate-600">
            Data pimpinan dan dokumen struktur kepengurusan Lembaga
            Kesejahteraan Sosial.
          </p>
        </div>

        <form
          id="sdm-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Data Pimpinan LKS
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Diisi oleh LKS sesuai dengan pimpinan yang tercantum dalam
              struktur kepengurusan.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="nama_pimpinan"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nama Ketua/Direktur/Kepala/Pimpinan
                </label>
                <input
                  id="nama_pimpinan"
                  name="nama_pimpinan"
                  type="text"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-500"
                  placeholder="Masukkan nama pimpinan"
                  defaultValue={savedData.nama_pimpinan || ""}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-500"
                  placeholder="contoh@email.com"
                  defaultValue={savedData.email || ""}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Data SDM / Struktur Kepengurusan LKS
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Unggah dokumen yang memuat data SDM atau struktur kepengurusan
              LKS untuk mendukung kebutuhan administrasi dan Tanda Daftar
              Dinas (TDD).
            </p>

            <div className="mt-5">
              <label
                htmlFor="data_sdm"
                className="block text-sm font-medium text-slate-700"
              >
                Upload Data SDM/Struktur Kepengurusan LKS
              </label>
              <input
                id="data_sdm"
                name="data_sdm"
                type="file"
                required={!savedData.data_sdm}
                accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  setFileName(e.target.files?.[0]?.name ?? "");
                }}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
              />
              {savedData.data_sdm && (
                <p className="mt-2 text-sm text-slate-600">
                  Data SDM / Struktur tersimpan: <span className="font-medium text-slate-900">{savedData.data_sdm}</span>
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                Dokumen digunakan sebagai data pendukung struktur
                kepengurusan LKS.
              </p>

              {fileName && (
                <p className="mt-3 text-sm text-green-700">
                  File dipilih: {fileName}
                </p>
              )}

              <div className="mt-6">
                <label
                  htmlFor="sdm_sertifikasi"
                  className="block text-sm font-medium text-slate-700"
                >
                  Upload SDM Sertifikasi
                </label>
                <input
                  id="sdm_sertifikasi"
                  name="sdm_sertifikasi"
                  type="file"
                  required={!savedData.sdm_sertifikasi}
                  accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
                />
                {savedData.sdm_sertifikasi && (
                  <p className="mt-2 text-sm text-slate-600">
                    SDM Sertifikasi tersimpan: <span className="font-medium text-slate-900">{savedData.sdm_sertifikasi}</span>
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  Unggah dokumen sertifikasi SDM dalam format PDF atau Excel.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-medium text-amber-900">Catatan</p>
            <p className="mt-1 text-sm text-amber-800">
              Data SDM pada modul ini tidak dicatat satu per satu berdasarkan
              nama personel. Informasi struktur kepengurusan disampaikan
              melalui dokumen yang diunggah dan disesuaikan dengan kebutuhan
              Tanda Daftar Dinas (TDD).
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
              onClick={() => router.push("/lks/daftar/legalitas")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Legalitas
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-green-700 px-5 py-2.5 font-medium text-white hover:bg-green-800"
            >
              Lanjut ke Layanan
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
