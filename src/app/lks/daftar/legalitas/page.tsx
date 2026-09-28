"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveFileAttachment } from "../_lib/attachments";
import {
  getSessionSnapshot,
  readSessionData,
  subscribeSessionStorage,
  writeSessionData,
} from "../_lib/persistence";
import { getCurrentLksId } from "../_lib/registration";

export default function LegalitasLksPage() {
  const router = useRouter();
  const lksId = getCurrentLksId();
  const isSaving = useRef(false);
  const [saving, setSaving] = useState(false);
  const [backendData, setBackendData] = useState<Record<string, string>>({});
  const [backendLoaded, setBackendLoaded] = useState(false);
  const [statusBadanHukum, setStatusBadanHukum] = useState("");

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-legalitas"),
    () => "",
  );

  const localSavedData = savedSnapshot
    ? readSessionData<Record<string, string>>("si-inuk-lks-legalitas", {})
    : {};
  const savedData = { ...localSavedData, ...backendData };

  useEffect(() => {
    let cancelled = false;

    async function loadLegalitas() {
      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const client = createClient();
      const [legalitasResult, snapshotResult] = await Promise.all([
        client
          .from("lks_legalitas")
          .select("nomor_akta_pendirian,tanggal_akta_pendirian,akta_notaris_file_name,akta_notaris_storage_path,nomor_pengesahan_kemenkumham,sk_pengesahan_kemenkumham_file_name,sk_pengesahan_kemenkumham_storage_path,ad_art_file_name,ad_art_storage_path,npwp_lks,status_badan_hukum")
          .eq("lks_id", lksId)
          .maybeSingle(),
        client
          .from("lks_registration_snapshot")
          .select("payload")
          .eq("lks_id", lksId)
          .eq("section_name", "legalitas")
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (legalitasResult.error || snapshotResult.error) {
        alert(
          `Gagal memuat data Legalitas dari Supabase: ${legalitasResult.error?.message || snapshotResult.error?.message}`,
        );
      } else {
        const row = legalitasResult.data;
        const payload = snapshotResult.data?.payload as Record<string, unknown> | null;
        const savedStatus = payload?.status_badan_hukum;

        setBackendData({
          ...(typeof row?.nomor_akta_pendirian === "string"
            ? { nomor_akta_pendirian: row.nomor_akta_pendirian }
            : {}),
          ...(typeof row?.tanggal_akta_pendirian === "string"
            ? { tanggal_akta_pendirian: row.tanggal_akta_pendirian }
            : {}),
          ...(typeof row?.nomor_pengesahan_kemenkumham === "string"
            ? { nomor_pengesahan_kemenkumham: row.nomor_pengesahan_kemenkumham }
            : {}),
          ...(typeof row?.npwp_lks === "string"
            ? { npwp_lks: row.npwp_lks }
            : {}),
          ...(row?.akta_notaris_storage_path
            ? {
                akta_notaris: row.akta_notaris_file_name || "",
                _akta_notaris_file_name: row.akta_notaris_file_name || "",
                _akta_notaris_storage_path: row.akta_notaris_storage_path,
              }
            : {}),
          ...(row?.sk_pengesahan_kemenkumham_storage_path
            ? {
                sk_pengesahan_kemenkumham:
                  row.sk_pengesahan_kemenkumham_file_name || "",
                _sk_pengesahan_kemenkumham_file_name:
                  row.sk_pengesahan_kemenkumham_file_name || "",
                _sk_pengesahan_kemenkumham_storage_path:
                  row.sk_pengesahan_kemenkumham_storage_path,
              }
            : {}),
          ...(row?.ad_art_storage_path
            ? {
                ad_art: row.ad_art_file_name || "",
                _ad_art_file_name: row.ad_art_file_name || "",
                _ad_art_storage_path: row.ad_art_storage_path,
              }
            : {}),
          ...(typeof savedStatus === "string"
            ? { status_badan_hukum: savedStatus }
            : typeof row?.status_badan_hukum === "string"
              ? { status_badan_hukum: row.status_badan_hukum }
              : {}),
        });
      }

      setBackendLoaded(true);
    }

    void loadLegalitas();
    return () => {
      cancelled = true;
    };
  }, [lksId]);

  const effectiveStatusBadanHukum =
    statusBadanHukum || savedData.status_badan_hukum || "";

  const persistLegalitas = async (form: HTMLFormElement) => {
    if (isSaving.current) return false;
    if (!lksId) {
      alert("ID LKS belum tersedia. Simpan Identitas LKS terlebih dahulu.");
      return false;
    }

    isSaving.current = true;
    setSaving(true);

    try {
      const formData = new FormData(form);
      const data: Record<string, string> = { ...savedData };

      for (const [key, value] of Array.from(formData.entries())) {
        if (value instanceof File) {
          // File input kosong saat kembali ke halaman.
          // Jangan timpa file lama dengan nama kosong.
          if (value.size > 0) {
            const storagePath = await saveFileAttachment(
              "legalitas",
              key,
              value,
            );

            data[key] = value.name;
            data[`_${key}_file_name`] = value.name;
            data[`_${key}_storage_path`] = storagePath;
          }
        } else {
          data[key] = value;
        }
      }

      const client = createClient();
      const { error: legalitasError } = await client
        .from("lks_legalitas")
        .upsert(
          {
            lks_id: lksId,
            nomor_akta_pendirian: data.nomor_akta_pendirian || null,
            tanggal_akta_pendirian: data.tanggal_akta_pendirian || null,
            status_badan_hukum:
              data.status_badan_hukum === "Berbadan Hukum" &&
              !data._sk_pengesahan_kemenkumham_storage_path
                ? null
                : data.status_badan_hukum || null,
            nomor_pengesahan_kemenkumham:
              data.nomor_pengesahan_kemenkumham || null,
            npwp_lks: data.npwp_lks || null,
            akta_notaris_file_name: data._akta_notaris_storage_path
              ? data._akta_notaris_file_name
              : null,
            akta_notaris_storage_path:
              data._akta_notaris_storage_path || null,
            sk_pengesahan_kemenkumham_file_name:
              data._sk_pengesahan_kemenkumham_storage_path
                ? data._sk_pengesahan_kemenkumham_file_name
                : null,
            sk_pengesahan_kemenkumham_storage_path:
              data._sk_pengesahan_kemenkumham_storage_path || null,
            ad_art_file_name: data._ad_art_storage_path
              ? data._ad_art_file_name
              : null,
            ad_art_storage_path: data._ad_art_storage_path || null,
          },
          { onConflict: "lks_id" },
        );

      if (legalitasError) {
        alert(`Gagal menyimpan Legalitas ke Supabase: ${legalitasError.message}`);
        return false;
      }

      const { error: snapshotError } = await client
        .from("lks_registration_snapshot")
        .upsert(
          {
            lks_id: lksId,
            section_name: "legalitas",
            payload: { status_badan_hukum: data.status_badan_hukum || null },
          },
          { onConflict: "lks_id,section_name" },
        );

      if (snapshotError) {
        alert(
          `Legalitas tersimpan sebagian, tetapi gagal menyimpan status badan hukum: ${snapshotError.message}`,
        );
        return false;
      }

      writeSessionData("si-inuk-lks-legalitas", data);
      setBackendData(data);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak diketahui.";
      alert(`Gagal menyimpan Legalitas: ${message}`);
      return false;
    } finally {
      isSaving.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const saved = await persistLegalitas(e.currentTarget);
    if (!saved) return;

    alert("Data Legalitas dan file lampiran berhasil tersimpan di Supabase.");
  };

  const handleNext = async () => {
    const form = document.getElementById("legalitas-form") as HTMLFormElement | null;

    if (!form) return;

    if (!form.reportValidity()) return;

    const saved = await persistLegalitas(form);
    if (!saved) return;

    router.push("/lks/daftar/sdm");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">SI-INUK</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — Legalitas
          </h1>
          <p className="mt-2 text-slate-600">
            Pengisian data legalitas Lembaga Kesejahteraan Sosial.
          </p>
        </div>

        <form
          key={backendLoaded ? "backend-loaded" : "local-cache"}
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
                    Akta Notaris tersimpan: {" "}
                    <span className="font-medium text-slate-900">
                      {savedData.akta_notaris}
                    </span>
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
                <option value="Tidak Berbadan Hukum">Tidak Berbadan Hukum</option>
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
                  SK Pengesahan tersimpan: {" "}
                  <span className="font-medium text-slate-900">
                    {savedData.sk_pengesahan_kemenkumham}
                  </span>
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">AD/ART</h2>

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
                  AD/ART tersimpan: {" "}
                  <span className="font-medium text-slate-900">
                    {savedData.ad_art}
                  </span>
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">NPWP</h2>

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
              disabled={saving}
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
              disabled={saving}
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
