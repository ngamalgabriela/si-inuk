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

export default function SdmLksPage() {
  const router = useRouter();
  const lksId = getCurrentLksId();
  const isSaving = useRef(false);
  const [saving, setSaving] = useState(false);
  const [backendData, setBackendData] = useState<Record<string, string>>({});
  const [backendLoaded, setBackendLoaded] = useState(false);
  const [fileName, setFileName] = useState("");

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-sdm"),
    () => ""
  );

  const localSavedData = savedSnapshot
    ? readSessionData<Record<string, string>>("si-inuk-lks-sdm", {})
    : {};
  const savedData = { ...localSavedData, ...backendData };

  useEffect(() => {
    let cancelled = false;

    async function loadSdm() {
      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const { data, error } = await createClient()
        .from("lks_sdm")
        .select("nama_pimpinan,email,data_sdm_file_name,data_sdm_storage_path,sertifikasi_file_name,sertifikasi_storage_path")
        .eq("lks_id", lksId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        alert(`Gagal memuat data SDM dari Supabase: ${error.message}`);
      } else if (data) {
        setBackendData({
          ...(typeof data.nama_pimpinan === "string" ? { nama_pimpinan: data.nama_pimpinan } : {}),
          ...(typeof data.email === "string" ? { email: data.email } : {}),
          ...(data.data_sdm_storage_path ? { data_sdm: data.data_sdm_file_name || "", _data_sdm_file_name: data.data_sdm_file_name || "", _data_sdm_storage_path: data.data_sdm_storage_path } : {}),
          ...(data.sertifikasi_storage_path ? { sdm_sertifikasi: data.sertifikasi_file_name || "", _sertifikasi_file_name: data.sertifikasi_file_name || "", _sertifikasi_storage_path: data.sertifikasi_storage_path } : {}),
        });
      }

      setBackendLoaded(true);
    }

    void loadSdm();
    return () => {
      cancelled = true;
    };
  }, [lksId]);

  const saveData = async (form: HTMLFormElement) => {
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
        data[key] = value.name;
        if (value.size > 0) {
          await saveFileAttachment("sdm", key, value);
        }
      } else {
        data[key] = value;
      }
    }

    const { error } = await createClient().from("lks_sdm").upsert(
      {
        lks_id: lksId,
        nama_pimpinan: data.nama_pimpinan || null,
        email: data.email || null,
        data_sdm_file_name: data._data_sdm_storage_path ? data._data_sdm_file_name : null,
        data_sdm_storage_path: data._data_sdm_storage_path || null,
        sertifikasi_file_name: data._sertifikasi_storage_path ? data._sertifikasi_file_name : null,
        sertifikasi_storage_path: data._sertifikasi_storage_path || null,
      },
      { onConflict: "lks_id" },
    );

    if (error) {
      alert(`Gagal menyimpan SDM ke Supabase: ${error.message}`);
      return false;
    }

    writeSessionData("si-inuk-lks-sdm", data);
    setBackendData(data);
    return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      alert(`Gagal menyimpan SDM: ${message}`);
      return false;
    } finally {
      isSaving.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const saved = await saveData(e.currentTarget);
    if (!saved) return;

    alert("Data SDM tersimpan di Supabase. File lampiran masih tersimpan di browser.");
  };

  const handleNext = async () => {
    const form = document.getElementById(
      "sdm-form"
    ) as HTMLFormElement | null;

    if (!form) return;

    if (!form.reportValidity()) {
      return;
    }

    const saved = await saveData(form);
    if (!saved) return;

    router.push("/lks/daftar/pm");
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
          key={backendLoaded ? "backend-loaded" : "local-cache"}
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
              disabled={saving}
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
              disabled={saving}
              className="rounded-lg bg-green-700 px-5 py-2.5 font-medium text-white hover:bg-green-800"
            >
              Lanjut ke PM
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
