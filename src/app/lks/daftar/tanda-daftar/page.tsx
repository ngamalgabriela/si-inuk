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
import { getSessionSnapshot, writeSessionData } from "../_lib/persistence";
import { getCurrentLksId } from "../_lib/registration";

type TddStatus = "DRAFT" | "DIAJUKAN";

const STORAGE_FIELDS = [
  "surat_permohonan",
  "kerjasama_dinas",
  "surat_keterangan_domisili",
] as const;

type StorageField = (typeof STORAGE_FIELDS)[number];

export default function TandaDaftarLksPage() {
  const router = useRouter();
  const lksId = getCurrentLksId();
  const isSaving = useRef(false);

  const [saving, setSaving] = useState(false);
  const [backendLoaded, setBackendLoaded] = useState(false);
  const [backendSummaries, setBackendSummaries] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [backendTdd, setBackendTdd] = useState<Record<string, unknown>>({});

  const getStatusPengajuan = (): TddStatus => {
    if (typeof window === "undefined") {
      return "DRAFT";
    }

    try {
      const raw = getSessionSnapshot("si-inuk-lks-tanda-daftar");

      if (!raw) {
        return "DRAFT";
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;

      return parsed.status_pengajuan === "DIAJUKAN"
        ? "DIAJUKAN"
        : "DRAFT";
    } catch {
      return "DRAFT";
    }
  };

  const [statusPengajuan, setStatusPengajuan] =
    useState<TddStatus>(() => getStatusPengajuan());

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

  const identitas = {
    ...(bacaData("si-inuk-lks-identitas") ?? {}),
    ...(backendSummaries.identitas ?? {}),
  };

  const legalitas = {
    ...(bacaData("si-inuk-lks-legalitas") ?? {}),
    ...(backendSummaries.legalitas ?? {}),
  };

  const sdm = {
    ...(bacaData("si-inuk-lks-sdm") ?? {}),
    ...(backendSummaries.sdm ?? {}),
  };

  const layanan = {
    ...(bacaData("si-inuk-lks-layanan") ?? {}),
    ...(backendSummaries.layanan ?? {}),
  };

  const pm = {
    ...(bacaData("si-inuk-lks-pm") ?? {}),
    ...(backendSummaries.pm ?? {}),
  };

  const sarpras = {
    ...(bacaData("si-inuk-lks-sarpras") ?? {}),
    ...(backendSummaries.sarpras ?? {}),
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationSummary() {
      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const client = createClient();

      const [
        identityResult,
        legalitasResult,
        snapshotResult,
        sdmResult,
        layananParentResult,
        pmParentResult,
        sarprasResult,
        tddResult,
      ] = await Promise.all([
        client
          .from("lks")
          .select(
            "id,nama_lks,status_lks,status_akreditasi,kecamatan,desa,alamat,latitude,longitude,email,telepon"
          )
          .eq("id", lksId)
          .maybeSingle(),

        client
          .from("lks_legalitas")
          .select(
            "nomor_akta_pendirian,tanggal_akta_pendirian,akta_notaris_file_name,akta_notaris_storage_path,status_badan_hukum,nomor_pengesahan_kemenkumham,sk_pengesahan_kemenkumham_file_name,sk_pengesahan_kemenkumham_storage_path,ad_art_file_name,ad_art_storage_path,npwp_lks"
          )
          .eq("lks_id", lksId)
          .maybeSingle(),

        client
          .from("lks_registration_snapshot")
          .select("payload")
          .eq("lks_id", lksId)
          .eq("section_name", "legalitas")
          .maybeSingle(),

        client
          .from("lks_sdm")
          .select(
            "nama_pimpinan,email,data_sdm_file_name,data_sdm_storage_path,sertifikasi_file_name,sertifikasi_storage_path"
          )
          .eq("lks_id", lksId)
          .maybeSingle(),

        client
          .from("lks_layanan")
          .select("id")
          .eq("lks_id", lksId)
          .maybeSingle(),

        client
          .from("lks_pm")
          .select("id")
          .eq("lks_id", lksId)
          .maybeSingle(),

        client
          .from("lks_sarpras")
          .select("item,nama,status,file_name,storage_path")
          .eq("lks_id", lksId),

        client
          .from("lks_tanda_daftar")
          .select("*")
          .eq("lks_id", lksId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const initialError =
        identityResult.error ||
        legalitasResult.error ||
        snapshotResult.error ||
        sdmResult.error ||
        layananParentResult.error ||
        pmParentResult.error ||
        sarprasResult.error ||
        tddResult.error;

      if (initialError) {
        alert(
          `Gagal memuat ringkasan pendaftaran dari Supabase: ${initialError.message}`
        );
        setBackendLoaded(true);
        return;
      }

      const childResults = await Promise.all([
        layananParentResult.data
          ? Promise.all([
              client
                .from("lks_layanan_jenis")
                .select("jenis_pelayanan")
                .eq("layanan_id", layananParentResult.data.id),

              client
                .from("lks_layanan_sasaran")
                .select("sasaran_pelayanan")
                .eq("layanan_id", layananParentResult.data.id),

              client
                .from("lks_layanan_permasalahan")
                .select("permasalahan_sosial")
                .eq("layanan_id", layananParentResult.data.id),

              client
                .from("lks_layanan_sistem")
                .select("sistem_pelayanan")
                .eq("layanan_id", layananParentResult.data.id),

              client
                .from("lks_layanan_wilayah")
                .select("kecamatan,desa")
                .eq("layanan_id", layananParentResult.data.id),
            ])
          : Promise.resolve(null),

        pmParentResult.data
          ? Promise.all([
              client
                .from("lks_pm_penerima_manfaat")
                .select(
                  "tahun_data,pm_perempuan,pm_laki_laki,bnba_file_name,bnba_storage_path"
                )
                .eq("pm_id", pmParentResult.data.id),

              client
                .from("lks_pm_pembinaan")
                .select("tahun,status,jenis_kegiatan_pembinaan")
                .eq("pm_id", pmParentResult.data.id),

              client
                .from("lks_pm_bantuan")
                .select(
                  "tahun,status,pemberi_bantuan,jenis_bantuan"
                )
                .eq("pm_id", pmParentResult.data.id),
            ])
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      const layananResults = childResults[0];
      const pmResults = childResults[1];

      const childError =
        layananResults?.find((result) => result.error)?.error ||
        pmResults?.find((result) => result.error)?.error;

      if (childError) {
        alert(
          `Gagal memuat rincian pendaftaran dari Supabase: ${childError.message}`
        );
        setBackendLoaded(true);
        return;
      }

      const readCurrentData = (
        key: string
      ): Record<string, unknown> | null => {
        const raw = getSessionSnapshot(key);

        if (!raw) return null;

        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return null;
        }
      };

      const localPm = readCurrentData("si-inuk-lks-pm");
      const localSarpras = readCurrentData("si-inuk-lks-sarpras");

      const localDocs = Array.isArray(localSarpras?.dokumentasi_wajib)
        ? (localSarpras.dokumentasi_wajib as Array<
            Record<string, unknown>
          >)
        : [];

      const localFacilities = Array.isArray(localSarpras?.sarpras)
        ? (localSarpras.sarpras as Array<Record<string, unknown>>)
        : [];

      const storageRows = sarprasResult.data ?? [];

      const mapSarpras = (
        row: (typeof storageRows)[number]
      ) => {
        const cached = [...localDocs, ...localFacilities].find(
          (item) => item.item === row.item
        );

        return {
          item: row.item,
          nama: row.nama,
          status:
            row.status ||
            (typeof cached?.status === "string"
              ? cached.status
              : ""),
          file: row.storage_path
            ? row.file_name || ""
            : typeof cached?.file === "string"
              ? cached.file
              : "",
        };
      };

      const pmLocalRecords = Array.isArray(
        localPm?.penerima_manfaat
      )
        ? (localPm.penerima_manfaat as Array<
            Record<string, unknown>
          >)
        : [];

      const remotePmRecords = pmResults?.[0].data ?? [];
      const remotePembinaan = pmResults?.[1].data ?? [];
      const remoteBantuan = pmResults?.[2].data ?? [];

      const legalRow = legalitasResult.data;

      const legalSnapshot =
        snapshotResult.data?.payload as Record<
          string,
          unknown
        > | null;

      const layananData = layananResults
        ? {
            jenis_pelayanan:
              layananResults[0].data?.map(
                (row) => row.jenis_pelayanan
              ) ?? [],

            sasaran_pelayanan:
              layananResults[1].data?.map(
                (row) => row.sasaran_pelayanan
              ) ?? [],

            permasalahan_sosial:
              layananResults[2].data?.map(
                (row) => row.permasalahan_sosial
              ) ?? [],

            sistem_pelayanan:
              layananResults[3].data?.map(
                (row) => row.sistem_pelayanan
              ) ?? [],

            cakupan_wilayah: JSON.stringify(
              layananResults[4].data?.map((row) => ({
                kecamatan: row.kecamatan,
                desa: row.desa,
              })) ?? []
            ),
          }
        : null;

      setBackendSummaries({
        ...(identityResult.data
          ? {
              identitas:
                identityResult.data as unknown as Record<
                  string,
                  unknown
                >,
            }
          : {}),

        ...(legalRow
          ? {
              legalitas: {
                nomor_akta_pendirian:
                  legalRow.nomor_akta_pendirian,

                tanggal_akta_pendirian:
                  legalRow.tanggal_akta_pendirian,

                status_badan_hukum:
                  legalSnapshot?.status_badan_hukum ??
                  legalRow.status_badan_hukum,

                nomor_pengesahan_kemenkumham:
                  legalRow.nomor_pengesahan_kemenkumham,

                npwp_lks: legalRow.npwp_lks,

                ...(legalRow.akta_notaris_storage_path
                  ? {
                      akta_notaris:
                        legalRow.akta_notaris_file_name,
                    }
                  : {}),

                ...(legalRow.sk_pengesahan_kemenkumham_storage_path
                  ? {
                      sk_pengesahan_kemenkumham:
                        legalRow.sk_pengesahan_kemenkumham_file_name,
                    }
                  : {}),

                ...(legalRow.ad_art_storage_path
                  ? {
                      ad_art: legalRow.ad_art_file_name,
                    }
                  : {}),
              },
            }
          : {}),

        ...(sdmResult.data
          ? {
              sdm: {
                nama_pimpinan:
                  sdmResult.data.nama_pimpinan,

                email: sdmResult.data.email,

                ...(sdmResult.data.data_sdm_storage_path
                  ? {
                      data_sdm:
                        sdmResult.data.data_sdm_file_name,
                    }
                  : {}),

                ...(sdmResult.data.sertifikasi_storage_path
                  ? {
                      sdm_sertifikasi:
                        sdmResult.data.sertifikasi_file_name,
                    }
                  : {}),
              },
            }
          : {}),

        ...(layananData
          ? {
              layanan: layananData,
            }
          : {}),

        ...(pmParentResult.data
          ? {
              pm: {
                pm_id: pmParentResult.data.id,

                penerima_manfaat: remotePmRecords.map(
                  (row) => {
                    const local = pmLocalRecords.find(
                      (item) =>
                        String(item.tahun_data ?? "") ===
                        row.tahun_data
                    );

                    return {
                      tahun_data: row.tahun_data,
                      pm_perempuan: row.pm_perempuan,
                      pm_laki_laki: row.pm_laki_laki,

                      jumlah_penerima_manfaat:
                        Number(row.pm_perempuan ?? 0) +
                        Number(row.pm_laki_laki ?? 0),

                      upload_bnba_pm:
                        row.bnba_storage_path
                          ? row.bnba_file_name || ""
                          : typeof local?.upload_bnba_pm ===
                              "string"
                            ? local.upload_bnba_pm
                            : "",
                    };
                  }
                ),

                pembinaan: remotePembinaan,
                bantuan: remoteBantuan,
              },
            }
          : {}),

        ...(storageRows.length
          ? {
              sarpras: {
                dokumentasi_wajib: storageRows
                  .filter((row) =>
                    [
                      "tampak_depan",
                      "papan_nama",
                      "foto_pm",
                    ].includes(row.item)
                  )
                  .map(mapSarpras),

                sarpras: storageRows
                  .filter(
                    (row) =>
                      ![
                        "tampak_depan",
                        "papan_nama",
                        "foto_pm",
                      ].includes(row.item)
                  )
                  .map(mapSarpras),
              },
            }
          : {}),
      });

      if (tddResult.data) {
        setBackendTdd(
          tddResult.data as Record<string, unknown>
        );

        if (
          tddResult.data.status_pengajuan === "DRAFT" ||
          tddResult.data.status_pengajuan === "DIAJUKAN"
        ) {
          setStatusPengajuan(
            tddResult.data.status_pengajuan
          );
        }
      }

      setBackendLoaded(true);
    }

    void loadRegistrationSummary();

    return () => {
      cancelled = true;
    };
  }, [lksId]);

  const bacaCakupanWilayah = (): {
    kecamatan: string;
    desa: string;
  }[] => {
    if (
      typeof layanan?.cakupan_wilayah !== "string" ||
      !layanan.cakupan_wilayah
    ) {
      return [];
    }

    try {
      const data = JSON.parse(
        layanan.cakupan_wilayah
      ) as unknown;

      if (!Array.isArray(data)) {
        return [];
      }

      return data.filter(
        (
          item
        ): item is {
          kecamatan: string;
          desa: string;
        } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { kecamatan?: unknown })
            .kecamatan === "string" &&
          typeof (item as { desa?: unknown }).desa ===
            "string"
      );
    } catch {
      return [];
    }
  };

  const cakupanWilayah = bacaCakupanWilayah();

  const validasiAjukan = (
    form: HTMLFormElement
  ) => {
    const suratPermohonan =
      form.elements.namedItem(
        "surat_permohonan"
      ) as HTMLInputElement | undefined;

    const fileSuratPermohonan =
      suratPermohonan?.files?.[0];

    const existingSuratPath =
      typeof backendTdd.surat_permohonan_storage_path ===
      "string"
        ? backendTdd.surat_permohonan_storage_path
        : "";

    if (!fileSuratPermohonan && !existingSuratPath) {
      alert(
        "Surat Permohonan Tanda Daftar Dinas wajib diunggah."
      );
      return false;
    }

    if (
      fileSuratPermohonan &&
      fileSuratPermohonan.type !== "application/pdf" &&
      !fileSuratPermohonan.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      alert(
        "Surat Permohonan Tanda Daftar Dinas harus berformat PDF."
      );
      return false;
    }

    const kerjaSamaDinas =
      form.elements.namedItem(
        "kerjasama_dinas"
      ) as HTMLInputElement | undefined;

    const kerjaSamaFile =
      kerjaSamaDinas?.files?.[0];

    if (
      kerjaSamaFile &&
      kerjaSamaFile.type !== "application/pdf" &&
      !kerjaSamaFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      alert(
        "File Kerja Sama dengan Dinas harus berformat PDF."
      );
      return false;
    }

    const suratDomisili =
      form.elements.namedItem(
        "surat_keterangan_domisili"
      ) as HTMLInputElement | undefined;

    const suratDomisiliFile =
      suratDomisili?.files?.[0];

    if (
      suratDomisiliFile &&
      suratDomisiliFile.type !== "application/pdf" &&
      !suratDomisiliFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      alert(
        "Surat Keterangan Domisili harus berformat PDF."
      );
      return false;
    }

    return true;
  };

  const simpanTdd = async (
    status: TddStatus
  ) => {
    const form = document.getElementById(
      "tdd-form"
    ) as HTMLFormElement | null;

    if (!form) return;

    if (isSaving.current) return;

    if (!lksId) {
      alert(
        "ID LKS belum tersedia. Simpan Identitas LKS terlebih dahulu."
      );
      return;
    }

    if (
      status === "DIAJUKAN" &&
      !validasiAjukan(form)
    ) {
      return;
    }

    isSaving.current = true;
    setSaving(true);

    try {
      const formData = new FormData(form);

      const data: Record<string, string> = {};

      const documentPayload: Record<
        string,
        string | null
      > = {};

      for (const field of STORAGE_FIELDS) {
        const fileNameColumn = `${field}_file_name`;
        const storagePathColumn = `${field}_storage_path`;

        const existingPath =
          backendTdd[storagePathColumn];

        const existingFileName =
          backendTdd[fileNameColumn];

        documentPayload[fileNameColumn] =
          typeof existingPath === "string"
            ? typeof existingFileName === "string"
              ? existingFileName
              : ""
            : null;

        documentPayload[storagePathColumn] =
          typeof existingPath === "string"
            ? existingPath
            : null;
      }

      for (const [key, value] of Array.from(
        formData.entries()
      )) {
        if (value instanceof File) {
          data[key] = value.name;

          if (
            value.size > 0 &&
            STORAGE_FIELDS.includes(
              key as StorageField
            )
          ) {
            const field =
              key as StorageField;

            const existingPath =
              backendTdd[
                `${field}_storage_path`
              ];

            const existingFileName =
              backendTdd[
                `${field}_file_name`
              ];

            const sameExistingFile =
              typeof existingPath ===
                "string" &&
              typeof existingFileName ===
                "string" &&
              existingFileName ===
                value.name;

            if (!sameExistingFile) {
              const storagePath =
                await saveFileAttachment(
                  "tanda-daftar",
                  field,
                  value
                );

              documentPayload[
                `${field}_file_name`
              ] = value.name;

              documentPayload[
                `${field}_storage_path`
              ] = storagePath;
            }
          }
        } else {
          data[key] = value;
        }
      }

      data.status_pengajuan = status;

      const { data: savedTdd, error } =
        await createClient()
          .from("lks_tanda_daftar")
          .upsert(
            {
              lks_id: lksId,
              status_pengajuan: status,
              ...documentPayload,
            },
            {
              onConflict: "lks_id",
            }
          )
          .select()
          .single();

      if (error) {
        alert(
          `Gagal menyimpan Tanda Daftar Dinas ke Supabase: ${error.message}`
        );
        return;
      }

      writeSessionData(
        "si-inuk-lks-tanda-daftar",
        data
      );

      if (savedTdd) {
        setBackendTdd(
          savedTdd as Record<string, unknown>
        );
      } else {
        setBackendTdd((current) => ({
          ...current,
          status_pengajuan: status,
          ...documentPayload,
        }));
      }

      setStatusPengajuan(status);

      if (status === "DIAJUKAN") {
        alert(
          "Tanda Daftar Dinas dan seluruh dokumen berhasil disimpan di Supabase."
        );
      } else {
        alert(
          "Draft Tanda Daftar Dinas dan dokumen berhasil disimpan di Supabase."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak diketahui.";

      alert(
        `Gagal menyimpan Tanda Daftar Dinas: ${message}`
      );
    } finally {
      isSaving.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
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
            Pengajuan Tanda Daftar Dinas bagi Lembaga
            Kesejahteraan Sosial.
          </p>
        </div>

        <form
          key={
            backendLoaded
              ? "backend-loaded"
              : "local-cache"
          }
          id="tdd-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
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
              Data berikut ditarik otomatis dari modul
              Identitas dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Nama LKS", "nama_lks"],
                ["Kecamatan", "kecamatan"],
                ["Desa/Kelurahan", "desa"],
                ["Alamat", "alamat"],
                ["Telepon", "telepon"],
                ["Email", "email"],
                ["Status LKS", "status_lks"],
                ["Status Akreditasi", "status_akreditasi"],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {typeof identitas?.[key] ===
                    "string"
                      ? String(identitas[key])
                      : "Belum tersedia"}
                  </p>
                </div>
              ))}
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Data Legalitas yang Sudah Tersedia
            </summary>

            <p className="mt-2 text-sm text-slate-600">
              Dokumen yang telah tersedia pada modul
              Legalitas tidak perlu diunggah kembali.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                [
                  "Nomor Akta Pendirian",
                  "nomor_akta_pendirian",
                ],
                [
                  "Tanggal Akta Pendirian",
                  "tanggal_akta_pendirian",
                ],
                [
                  "Status Badan Hukum",
                  "status_badan_hukum",
                ],
                [
                  "Nomor Pengesahan Kemenkumham",
                  "nomor_pengesahan_kemenkumham",
                ],
                ["NPWP LKS", "npwp_lks"],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {typeof legalitas?.[key] ===
                    "string"
                      ? String(legalitas[key])
                      : "Belum tersedia"}
                  </p>
                </div>
              ))}

              {[
                ["Akta Pendirian / Akta Notaris", "akta_notaris"],
                [
                  "SK Pengesahan Kemenkumham",
                  "sk_pengesahan_kemenkumham",
                ],
                ["AD/ART", "ad_art"],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {typeof legalitas?.[key] ===
                      "string" &&
                    legalitas[key]
                      ? String(legalitas[key])
                      : "Dokumen belum tersedia"}
                  </p>
                </div>
              ))}
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
                  {typeof sdm?.nama_pimpinan ===
                    "string" &&
                  sdm.nama_pimpinan
                    ? sdm.nama_pimpinan
                    : "Belum tersedia"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof sdm?.email === "string" &&
                  sdm.email
                    ? sdm.email
                    : "Belum tersedia"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Data SDM / Struktur Kepengurusan LKS
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {typeof sdm?.data_sdm ===
                    "string" && sdm.data_sdm
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
              Data berikut ditarik otomatis dari modul
              Layanan dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 space-y-4">
              {[
                ["Jenis Pelayanan", "jenis_pelayanan"],
                ["Sasaran Pelayanan", "sasaran_pelayanan"],
                ["Permasalahan Sosial", "permasalahan_sosial"],
                ["Sistem Pelayanan", "sistem_pelayanan"],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {Array.isArray(layanan?.[key])
                      ? (
                          layanan[key] as unknown[]
                        ).join(", ")
                      : typeof layanan?.[key] ===
                          "string"
                        ? String(layanan[key])
                        : "Belum tersedia"}
                  </p>
                </div>
              ))}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cakupan Wilayah Pelayanan
                </p>

                {cakupanWilayah.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {cakupanWilayah.map(
                      (wilayah, index) => (
                        <li
                          key={`${wilayah.kecamatan}-${wilayah.desa}-${index}`}
                          className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        >
                          <span className="font-medium text-slate-900">
                            {wilayah.kecamatan}
                          </span>

                          <span className="mx-2 text-slate-400">
                            —
                          </span>

                          <span>
                            {wilayah.desa}
                          </span>
                        </li>
                      )
                    )}
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
              Data berikut ditarik otomatis dari modul
              Penerima Manfaat dan tidak perlu diisi ulang.
            </p>

            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Penerima Manfaat
                </h3>

                {Array.isArray(
                  pm?.penerima_manfaat
                ) &&
                pm.penerima_manfaat.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {pm.penerima_manfaat.map(
                      (record, index) => {
                        const data =
                          record as Record<
                            string,
                            unknown
                          >;

                        return (
                          <div
                            key={index}
                            className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                          >
                            <p>
                              <span className="font-medium text-slate-900">
                                Tahun:
                              </span>{" "}
                              {typeof data.tahun_data ===
                              "string"
                                ? data.tahun_data
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Perempuan:
                              </span>{" "}
                              {typeof data.pm_perempuan ===
                              "number"
                                ? data.pm_perempuan
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Laki-laki:
                              </span>{" "}
                              {typeof data.pm_laki_laki ===
                              "number"
                                ? data.pm_laki_laki
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Jumlah Penerima Manfaat:
                              </span>{" "}
                              {typeof data.jumlah_penerima_manfaat ===
                              "number"
                                ? data.jumlah_penerima_manfaat
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                BNBA:
                              </span>{" "}
                              {typeof data.upload_bnba_pm ===
                                "string" &&
                              data.upload_bnba_pm
                                ? data.upload_bnba_pm
                                : "Dokumen belum tersedia"}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">
                    Belum tersedia
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pembinaan
                </h3>

                {Array.isArray(pm?.pembinaan) &&
                pm.pembinaan.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {pm.pembinaan.map(
                      (record, index) => {
                        const data =
                          record as Record<
                            string,
                            unknown
                          >;

                        return (
                          <div
                            key={index}
                            className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                          >
                            <p>
                              <span className="font-medium text-slate-900">
                                Tahun:
                              </span>{" "}
                              {typeof data.tahun ===
                              "string"
                                ? data.tahun
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Status:
                              </span>{" "}
                              {typeof data.status ===
                              "string"
                                ? data.status
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Jenis Kegiatan Pembinaan:
                              </span>{" "}
                              {typeof data.jenis_kegiatan_pembinaan ===
                                "string" &&
                              data.jenis_kegiatan_pembinaan
                                ? data.jenis_kegiatan_pembinaan
                                : "Tidak ada"}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">
                    Belum tersedia
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Bantuan
                </h3>

                {Array.isArray(pm?.bantuan) &&
                pm.bantuan.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {pm.bantuan.map(
                      (record, index) => {
                        const data =
                          record as Record<
                            string,
                            unknown
                          >;

                        return (
                          <div
                            key={index}
                            className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                          >
                            <p>
                              <span className="font-medium text-slate-900">
                                Tahun:
                              </span>{" "}
                              {typeof data.tahun ===
                              "string"
                                ? data.tahun
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Status:
                              </span>{" "}
                              {typeof data.status ===
                              "string"
                                ? data.status
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Pemberi Bantuan:
                              </span>{" "}
                              {typeof data.pemberi_bantuan ===
                                "string" &&
                              data.pemberi_bantuan
                                ? data.pemberi_bantuan
                                : "Tidak ada"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Jenis Bantuan:
                              </span>{" "}
                              {typeof data.jenis_bantuan ===
                                "string" &&
                              data.jenis_bantuan
                                ? data.jenis_bantuan
                                : "Tidak ada"}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">
                    Belum tersedia
                  </p>
                )}
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-xl font-semibold text-slate-900">
              Ringkasan Sarana dan Prasarana
            </summary>

            <p className="mt-2 text-sm text-slate-600">
              Data berikut ditarik otomatis dari modul
              Sarana dan Prasarana dan tidak perlu diisi
              ulang.
            </p>

            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Dokumentasi Wajib
                </h3>

                {Array.isArray(
                  sarpras?.dokumentasi_wajib
                ) &&
                sarpras.dokumentasi_wajib.length >
                  0 ? (
                  <div className="mt-3 space-y-3">
                    {sarpras.dokumentasi_wajib.map(
                      (record, index) => {
                        const data =
                          record as Record<
                            string,
                            unknown
                          >;

                        return (
                          <div
                            key={index}
                            className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                          >
                            <p>
                              <span className="font-medium text-slate-900">
                                Dokumentasi:
                              </span>{" "}
                              {typeof data.nama ===
                              "string"
                                ? data.nama
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                File:
                              </span>{" "}
                              {typeof data.file ===
                                "string" &&
                              data.file
                                ? data.file
                                : "Dokumen belum tersedia"}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">
                    Belum tersedia
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sarana dan Prasarana LKS
                </h3>

                {Array.isArray(sarpras?.sarpras) &&
                sarpras.sarpras.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {sarpras.sarpras.map(
                      (record, index) => {
                        const data =
                          record as Record<
                            string,
                            unknown
                          >;

                        return (
                          <div
                            key={index}
                            className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
                          >
                            <p>
                              <span className="font-medium text-slate-900">
                                Komponen:
                              </span>{" "}
                              {typeof data.nama ===
                              "string"
                                ? data.nama
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                Status:
                              </span>{" "}
                              {typeof data.status ===
                                  "string" &&
                              data.status
                                ? data.status
                                : "Belum tersedia"}
                            </p>

                            <p className="mt-1">
                              <span className="font-medium text-slate-900">
                                File:
                              </span>{" "}
                              {typeof data.file ===
                                "string" &&
                              data.file
                                ? data.file
                                : "Dokumen belum tersedia"}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">
                    Belum tersedia
                  </p>
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
                <span className="ml-1 text-red-600">
                  *
                </span>
              </label>

              <input
                id="surat_permohonan"
                name="surat_permohonan"
                type="file"
                accept=".pdf,application/pdf"
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              />

              {typeof backendTdd.surat_permohonan_file_name ===
                "string" &&
              backendTdd.surat_permohonan_file_name ? (
                <p className="mt-2 text-sm text-slate-600">
                  File tersimpan:{" "}
                  <span className="font-medium">
                    {
                      backendTdd.surat_permohonan_file_name
                    }
                  </span>
                </p>
              ) : null}

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

              {typeof backendTdd.kerjasama_dinas_file_name ===
                "string" &&
              backendTdd.kerjasama_dinas_file_name ? (
                <p className="mt-2 text-sm text-slate-600">
                  File tersimpan:{" "}
                  <span className="font-medium">
                    {
                      backendTdd.kerjasama_dinas_file_name
                    }
                  </span>
                </p>
              ) : null}

              <p className="mt-1 text-xs text-slate-500">
                Opsional. Jika ada, format yang
                diterima: PDF. Jika belum ada, dapat
                dikosongkan.
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

              {typeof backendTdd.surat_keterangan_domisili_file_name ===
                "string" &&
              backendTdd.surat_keterangan_domisili_file_name ? (
                <p className="mt-2 text-sm text-slate-600">
                  File tersimpan:{" "}
                  <span className="font-medium">
                    {
                      backendTdd.surat_keterangan_domisili_file_name
                    }
                  </span>
                </p>
              ) : null}

              <p className="mt-1 text-xs text-slate-500">
                Opsional. Jika diunggah, format yang
                diterima: PDF.
              </p>
            </div>
          </details>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push("/lks/daftar/layanan")
              }
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Layanan
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
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {saving
                ? "Menyimpan..."
                : "Simpan Draft"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              {saving
                ? "Menyimpan..."
                : "Ajukan Tanda Daftar Dinas"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}