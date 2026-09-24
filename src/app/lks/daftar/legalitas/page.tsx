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

export default function LegalitasLksPage() {
  const router = useRouter();
  const [statusBadanHukum, setStatusBadanHukum] = useState("");

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-legalitas"),
    () => ""
  );

  const savedData = savedSnapshot
    ? readSessionData<Record<string, string>>("si-inuk-lks-legalitas", {})
    : {};

  const effectiveStatusBadanHukum =
    statusBadanHukum || savedData.status_badan_hukum || "";

  const persistLegalitas = async (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const data: Record<string, string> = { ...savedData };

    for (const [key, value] of Array.from(formData.entries())) {
      if (value instanceof File) {
        data[key] = value.name;
        if (value.size > 0) {
          await saveFileAttachment("legalitas", key, value);
        }
      } else {
        data[key] = value;
      }
    }

    writeSessionData("si-inuk-lks-legalitas", data);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await persistLegalitas(e.currentTarget);

    alert("Data Legalitas LKS berhasil disimpan sementara.");
  };

  const handleNext = async () => {
    const form = document.getElementById(
      "legalitas-form"
    ) as HTMLFormElement | null;

    if (!form) return;

    if (!form.reportValidity()) {
      return;
    }

    await persistLegalitas(form);

    router.push("/lks/daftar/sdm");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            SI-INUK
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — Legalitas
          </h1>
          <p className="mt-2 text-slate-600">
            Pengisian data legalitas Lembaga Kesejahteraan Sosial.
          </p>
        </div>

        <form
          id="legalitas-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Data Akta Pendirian
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="nomor_akta_pendirian"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nomor Akta Pendirian
                </label>
                <input
                  id="nomor_akta_pendirian"
                  name="nomor_akta_pendirian"
                  defaultValue={savedData.nomor_akta_pendirian || ""}
                  type="text"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="tanggal_akta_pendirian"
                  className="block text-sm font-medium text-slate-700"
                >
                  Tanggal Akta Pendirian
                </label>
                <input
                  id="tanggal_akta_pendirian"
                  name="tanggal_akta_pendirian"
                  defaultValue={savedData.tanggal_akta_pendirian || ""}
                  type="date"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="akta_notaris"
                  className="block text-sm font-medium text-slate-700"
                >
                  Upload Akta Notaris
                </label>
                <input
                  id="akta_notaris"
                  name="akta_notaris"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required={!savedData.akta_notaris}
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                />
              {savedData.akta_notaris && (
                <p className="mt-2 text-sm text-slate-600">
                  Akta Notaris tersimpan: <span className="font-medium text-slate-900">{savedData.akta_notaris}</span>
                </p>
              )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Status Badan Hukum
            </h2>

            <div className="mt-5">
              <label
                htmlFor="status_badan_hukum"
                className="block text-sm font-medium text-slate-700"
              >
                Status Badan Hukum
              </label>
              <select
                id="status_badan_hukum"
                name="status_badan_hukum"
                value={effectiveStatusBadanHukum}
                onChange={(e) => setStatusBadanHukum(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Pilih Status Badan Hukum</option>
                <option value="Berbadan Hukum">Berbadan Hukum</option>
                <option value="Tidak Berbadan Hukum">
                  Tidak Berbadan Hukum
                </option>
              </select>
            </div>

            <div className="mt-5">
              <label
                htmlFor="nomor_pengesahan_kemenkumham"
                className="block text-sm font-medium text-slate-700"
              >
                Nomor Pengesahan Kemenkumham
              </label>
              <input
                id="nomor_pengesahan_kemenkumham"
                name="nomor_pengesahan_kemenkumham"
                defaultValue={savedData.nomor_pengesahan_kemenkumham || ""}
                type="text"
                disabled={effectiveStatusBadanHukum !== "Berbadan Hukum"}
                required={effectiveStatusBadanHukum === "Berbadan Hukum"}
                placeholder={
                  effectiveStatusBadanHukum === "Berbadan Hukum"
                    ? "Masukkan nomor pengesahan Kemenkumham"
                    : "Tidak aktif jika tidak berbadan hukum"
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="sk_pengesahan_kemenkumham"
                className="block text-sm font-medium text-slate-700"
              >
                Upload SK Pengesahan Kemenkumham
              </label>
              <input
                id="sk_pengesahan_kemenkumham"
                name="sk_pengesahan_kemenkumham"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={effectiveStatusBadanHukum !== "Berbadan Hukum"}
                required={
                  effectiveStatusBadanHukum === "Berbadan Hukum" &&
                  !savedData.sk_pengesahan_kemenkumham
                }
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-4 py-3 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500">
                Wajib diisi jika LKS berbadan hukum.
              </p>
              {savedData.sk_pengesahan_kemenkumham && (
                <p className="mt-2 text-sm text-slate-600">
                  SK Pengesahan tersimpan: <span className="font-medium text-slate-900">{savedData.sk_pengesahan_kemenkumham}</span>
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              AD/ART
            </h2>

            <div className="mt-5">
              <label
                htmlFor="ad_art"
                className="block text-sm font-medium text-slate-700"
              >
                Upload AD/ART
              </label>
              <input
                id="ad_art"
                name="ad_art"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required={!savedData.ad_art}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-4 py-3 text-sm text-slate-700"
              />
              {savedData.ad_art && (
                <p className="mt-2 text-sm text-slate-600">
                  AD/ART tersimpan: <span className="font-medium text-slate-900">{savedData.ad_art}</span>
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              NPWP
            </h2>

            <div className="mt-5">
              <label
                htmlFor="npwp_lks"
                className="block text-sm font-medium text-slate-700"
              >
                NPWP LKS
              </label>
              <input
                id="npwp_lks"
                name="npwp_lks"
                defaultValue={savedData.npwp_lks || ""}
                type="text"
                required
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Simpan Data
            </button>

            <button
              type="button"
              onClick={() => router.push("/lks/daftar")}
              className="rounded-lg bg-slate-600 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Kembali ke Daftar
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
            >
              Lanjut ke SDM
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
