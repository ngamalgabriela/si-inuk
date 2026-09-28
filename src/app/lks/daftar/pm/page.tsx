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

const tahunSaatIni = new Date().getFullYear();

type PmRecord = {
  id: number;
  tahun: string;
  perempuan: string;
  lakiLaki: string;
  bnba: File | null;
  bnbaFileName?: string;
  bnbaStoragePath?: string;
  bnbaStoredFileName?: string;
};

type PembinaanRecord = {
  id: number;
  tahun: string;
  status: "YA" | "TIDAK_ADA";
  jenis: string;
  dbId?: string;
};

type BantuanRecord = {
  id: number;
  tahun: string;
  status: "ADA" | "TIDAK_ADA";
  pemberi: string;
  jenis: string;
  dbId?: string;
};

export default function PenerimaManfaatLksPage() {
  const router = useRouter();
  const lksId = getCurrentLksId();
  const isSaving = useRef(false);
  const [saving, setSaving] = useState(false);
  const [pmId, setPmId] = useState<string | null>(null);
  const [backendLoaded, setBackendLoaded] = useState(false);

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-pm"),
    () => "",
  );

  let savedData: {
    penerima_manfaat?: unknown;
    pembinaan?: unknown;
    bantuan?: unknown;
    pm_id?: unknown;
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
            bnbaStoragePath: typeof data.bnba_storage_path === "string" ? data.bnba_storage_path : undefined,
            bnbaStoredFileName: typeof data.bnba_file_name === "string" ? data.bnba_file_name : undefined,
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
            dbId: typeof data.db_id === "string" ? data.db_id : undefined,
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
              dbId: typeof data.db_id === "string" ? data.db_id : undefined,
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
              dbId: typeof data.db_id === "string" ? data.db_id : undefined,
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
              dbId: typeof data.db_id === "string" ? data.db_id : undefined,
            } as BantuanRecord;
          })
          .filter((item): item is BantuanRecord => item !== null)
      : [];

  useEffect(() => {
    let cancelled = false;

    async function loadPm() {
      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const client = createClient();
      const parentResult = await client
        .from("lks_pm")
        .select("id")
        .eq("lks_id", lksId)
        .maybeSingle();

      if (cancelled) return;
      if (parentResult.error) {
        alert(`Gagal memuat data PM dari Supabase: ${parentResult.error.message}`);
        setBackendLoaded(true);
        return;
      }

      if (!parentResult.data) {
        setBackendLoaded(true);
        return;
      }

      const parentId = parentResult.data.id;
      const [benefitsResult, developmentResult, aidResult] = await Promise.all([
        client
          .from("lks_pm_penerima_manfaat")
          .select("id,tahun_data,pm_perempuan,pm_laki_laki,bnba_file_name,bnba_storage_path")
          .eq("pm_id", parentId)
          .order("tahun_data"),
        client
          .from("lks_pm_pembinaan")
          .select("id,tahun,status,jenis_kegiatan_pembinaan")
          .eq("pm_id", parentId)
          .order("tahun"),
        client
          .from("lks_pm_bantuan")
          .select("id,tahun,status,pemberi_bantuan,jenis_bantuan")
          .eq("pm_id", parentId)
          .order("tahun"),
      ]);

      if (cancelled) return;

      const queryError = benefitsResult.error || developmentResult.error || aidResult.error;
      if (queryError) {
        alert(`Gagal memuat rincian PM dari Supabase: ${queryError.message}`);
        setBackendLoaded(true);
        return;
      }

      const cachedPmData = readSessionData<Record<string, unknown>>("si-inuk-lks-pm", {});
      const localBenefits = Array.isArray(cachedPmData.penerima_manfaat)
        ? cachedPmData.penerima_manfaat as Array<Record<string, unknown>>
        : [];
      const benefits = (benefitsResult.data ?? []).map((row, index) => {
        const local = localBenefits.find((item) => String(item.tahun_data ?? "") === row.tahun_data);
        return {
          id: index + 1,
          tahun: row.tahun_data,
          perempuan: String(row.pm_perempuan ?? ""),
          lakiLaki: String(row.pm_laki_laki ?? ""),
          bnba: null,
          bnbaFileName: typeof local?.upload_bnba_pm === "string" ? local.upload_bnba_pm : row.bnba_file_name || "",
          bnbaStoragePath: row.bnba_storage_path || undefined,
          bnbaStoredFileName: row.bnba_file_name || undefined,
        } satisfies PmRecord;
      });
      const developments = (developmentResult.data ?? []).map((row, index) => ({
        id: index + 1,
        dbId: row.id,
        tahun: row.tahun,
        status: row.status,
        jenis: row.jenis_kegiatan_pembinaan || "",
      } satisfies PembinaanRecord));
      const aids = (aidResult.data ?? []).map((row, index) => ({
        id: index + 1,
        dbId: row.id,
        tahun: row.tahun,
        status: row.status,
        pemberi: row.pemberi_bantuan || "",
        jenis: row.jenis_bantuan || "",
      } satisfies BantuanRecord));

      setPmId(parentId);
      setPmRecords(benefits.length ? benefits : [{ id: 1, tahun: String(tahunSaatIni), perempuan: "", lakiLaki: "", bnba: null }]);
      setPembinaanRecords(developments.length ? developments : [{ id: 1, tahun: String(tahunSaatIni), status: "TIDAK_ADA", jenis: "" }]);
      setBantuanRecords(aids.length ? aids : [{ id: 1, tahun: String(tahunSaatIni), status: "TIDAK_ADA", pemberi: "", jenis: "" }]);
      setBackendLoaded(true);
    }

    void loadPm();
    return () => {
      cancelled = true;
    };
  }, [lksId]);

  const effectivePmRecords = !backendLoaded &&
    savedPmRecords.length > 0 &&
    pmRecords.length === 1 &&
    !pmRecords[0].perempuan &&
    !pmRecords[0].lakiLaki &&
    !pmRecords[0].bnba &&
    !pmRecords[0].bnbaFileName
        ? savedPmRecords
      : pmRecords;

      const effectivePembinaanRecords = !backendLoaded &&
    savedPembinaanRecords.length > 0 &&
    pembinaanRecords.length === 1 &&
    pembinaanRecords[0].status === "TIDAK_ADA" &&
    !pembinaanRecords[0].jenis
        ? savedPembinaanRecords
      : pembinaanRecords;

      const effectiveBantuanRecords = !backendLoaded &&
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
          bnba_file_name: record.bnbaStoragePath ? record.bnbaStoredFileName || record.bnbaFileName || "" : null,
          bnba_storage_path: record.bnbaStoragePath || null,
        };
      }),
    );

    const pembinaan = effectivePembinaanRecords.map((record) => ({
      db_id: record.dbId || "",
      tahun: record.tahun,
      status: record.status,
      jenis_kegiatan_pembinaan:
        record.status === "YA" ? record.jenis : "",
    }));
    const bantuan = effectiveBantuanRecords.map((record) => ({
      db_id: record.dbId || "",
      tahun: record.tahun,
      status: record.status,
      pemberi_bantuan: record.status === "ADA" ? record.pemberi : "",
      jenis_bantuan: record.status === "ADA" ? record.jenis : "",
    }));

    setPembinaanRecords((records) => records.map((record) => ({
      ...record,
      dbId: pembinaan.find((item, index) => effectivePembinaanRecords[index]?.id === record.id)?.db_id || record.dbId,
    })));
    setBantuanRecords((records) => records.map((record) => ({
      ...record,
      dbId: bantuan.find((item, index) => effectiveBantuanRecords[index]?.id === record.id)?.db_id || record.dbId,
    })));

    return {
      pm_id: pmId || (typeof savedData.pm_id === "string" ? savedData.pm_id : ""),
      penerima_manfaat: penerimaManfaat,
      pembinaan,
      bantuan,
    };
  };

  const persistPm = async () => {
    if (isSaving.current) return false;
    if (!lksId) {
      alert("ID LKS belum tersedia. Simpan Identitas LKS terlebih dahulu.");
      return false;
    }

    isSaving.current = true;
    setSaving(true);

    try {
      const data = await buildPmData();
      writeSessionData("si-inuk-lks-pm", data);

      const client = createClient();
      const { data: parent, error: parentError } = await client
        .from("lks_pm")
        .upsert({ lks_id: lksId }, { onConflict: "lks_id" })
        .select("id")
        .single();

      if (parentError) {
        alert(`Gagal menyimpan data induk PM ke Supabase: ${parentError.message}`);
        return false;
      }

      const currentPmId = parent.id;
      setPmId(currentPmId);
      const cachedData = { ...data, pm_id: currentPmId };
      writeSessionData("si-inuk-lks-pm", cachedData);

      const benefits = (data.penerima_manfaat as Array<Record<string, unknown>>).map((item) => ({
        pm_id: currentPmId,
        tahun_data: String(item.tahun_data),
        pm_perempuan: Number(item.pm_perempuan) || 0,
        pm_laki_laki: Number(item.pm_laki_laki) || 0,
        bnba_file_name: item.bnba_file_name,
        bnba_storage_path: item.bnba_storage_path,
      }));
      const benefitRowsResult = await client
        .from("lks_pm_penerima_manfaat")
        .select("id,tahun_data")
        .eq("pm_id", currentPmId);
      if (benefitRowsResult.error) {
        alert(`Gagal memeriksa tahun Penerima Manfaat di Supabase: ${benefitRowsResult.error.message}`);
        return false;
      }
      if (benefits.length) {
        const { error } = await client
          .from("lks_pm_penerima_manfaat")
          .upsert(benefits, { onConflict: "pm_id,tahun_data" });
        if (error) {
          alert(`Gagal menyimpan data Penerima Manfaat ke Supabase: ${error.message}`);
          return false;
        }
      }
      const selectedYears = new Set(benefits.map((item) => item.tahun_data));
      const staleBenefitIds = (benefitRowsResult.data ?? [])
        .filter((row) => !selectedYears.has(row.tahun_data))
        .map((row) => row.id);
      if (staleBenefitIds.length) {
        const { error } = await client
          .from("lks_pm_penerima_manfaat")
          .delete()
          .eq("pm_id", currentPmId)
          .in("id", staleBenefitIds);
        if (error) {
          alert(`Data PM tersimpan, tetapi gagal menghapus tahun yang dikeluarkan: ${error.message}`);
          return false;
        }
      }

      const developmentRowsResult = await client
        .from("lks_pm_pembinaan")
        .select("id,tahun,status,jenis_kegiatan_pembinaan")
        .eq("pm_id", currentPmId);
      if (developmentRowsResult.error) {
        alert(`Gagal memeriksa data Pembinaan di Supabase: ${developmentRowsResult.error.message}`);
        return false;
      }
      const existingDevelopments = developmentRowsResult.data ?? [];
      const usedDevelopmentIds = new Set<string>();
      const savedDevelopmentIds: string[] = [];
      for (const item of data.pembinaan as Array<Record<string, unknown>>) {
        const tahun = String(item.tahun);
        const status = String(item.status);
        const jenis = status === "YA" ? String(item.jenis_kegiatan_pembinaan) : "";
        const existing = (typeof item.db_id === "string" && item.db_id
          ? existingDevelopments.find((row) => row.id === item.db_id && !usedDevelopmentIds.has(row.id))
          : undefined) ?? existingDevelopments.find((row) =>
          !usedDevelopmentIds.has(row.id) &&
          row.tahun === tahun &&
          row.status === status &&
          (row.jenis_kegiatan_pembinaan || "") === jenis,
        );

        let rowId = existing?.id;
        if (existing) {
          const { error } = await client
            .from("lks_pm_pembinaan")
            .update({ tahun, status, jenis_kegiatan_pembinaan: jenis || null })
            .eq("id", existing.id)
            .eq("pm_id", currentPmId);
          if (error) {
            alert(`Gagal memperbarui data Pembinaan di Supabase: ${error.message}`);
            return false;
          }
        } else {
          const { data: inserted, error } = await client
            .from("lks_pm_pembinaan")
            .insert({ pm_id: currentPmId, tahun, status, jenis_kegiatan_pembinaan: jenis || null })
            .select("id")
            .single();
          if (error) {
            alert(`Gagal menyimpan data Pembinaan ke Supabase: ${error.message}`);
            return false;
          }
          rowId = inserted.id;
        }

        if (rowId) {
          usedDevelopmentIds.add(rowId);
          savedDevelopmentIds.push(rowId);
        }
      }

      const staleDevelopmentIds = existingDevelopments.map((row) => row.id).filter((id) => !usedDevelopmentIds.has(id));
      if (staleDevelopmentIds.length) {
        const { error } = await client.from("lks_pm_pembinaan").delete().eq("pm_id", currentPmId).in("id", staleDevelopmentIds);
        if (error) {
          alert(`Data PM tersimpan, tetapi gagal memperbarui daftar Pembinaan: ${error.message}`);
          return false;
        }
      }

      const aidRowsResult = await client
        .from("lks_pm_bantuan")
        .select("id,tahun,status,pemberi_bantuan,jenis_bantuan")
        .eq("pm_id", currentPmId);
      if (aidRowsResult.error) {
        alert(`Gagal memeriksa data Bantuan di Supabase: ${aidRowsResult.error.message}`);
        return false;
      }
      const existingAids = aidRowsResult.data ?? [];
      const usedAidIds = new Set<string>();
      const savedAidIds: string[] = [];
      for (const item of data.bantuan as Array<Record<string, unknown>>) {
        const tahun = String(item.tahun);
        const status = String(item.status);
        const pemberi = status === "ADA" ? String(item.pemberi_bantuan) : "";
        const jenis = status === "ADA" ? String(item.jenis_bantuan) : "";
        const existing = (typeof item.db_id === "string" && item.db_id
          ? existingAids.find((row) => row.id === item.db_id && !usedAidIds.has(row.id))
          : undefined) ?? existingAids.find((row) =>
          !usedAidIds.has(row.id) &&
          row.tahun === tahun &&
          row.status === status &&
          (row.pemberi_bantuan || "") === pemberi &&
          (row.jenis_bantuan || "") === jenis,
        );

        let rowId = existing?.id;
        if (existing) {
          const { error } = await client
            .from("lks_pm_bantuan")
            .update({ tahun, status, pemberi_bantuan: pemberi || null, jenis_bantuan: jenis || null })
            .eq("id", existing.id)
            .eq("pm_id", currentPmId);
          if (error) {
            alert(`Gagal memperbarui data Bantuan di Supabase: ${error.message}`);
            return false;
          }
        } else {
          const { data: inserted, error } = await client
            .from("lks_pm_bantuan")
            .insert({ pm_id: currentPmId, tahun, status, pemberi_bantuan: pemberi || null, jenis_bantuan: jenis || null })
            .select("id")
            .single();
          if (error) {
            alert(`Gagal menyimpan data Bantuan ke Supabase: ${error.message}`);
            return false;
          }
          rowId = inserted.id;
        }

        if (rowId) {
          usedAidIds.add(rowId);
          savedAidIds.push(rowId);
        }
      }

      const staleAidIds = existingAids.map((row) => row.id).filter((id) => !usedAidIds.has(id));
      if (staleAidIds.length) {
        const { error } = await client.from("lks_pm_bantuan").delete().eq("pm_id", currentPmId).in("id", staleAidIds);
        if (error) {
          alert(`Data PM tersimpan, tetapi gagal memperbarui daftar Bantuan: ${error.message}`);
          return false;
        }
      }

      const persistedData = {
        ...cachedData,
        pembinaan: (data.pembinaan as Array<Record<string, unknown>>).map((item, index) => ({ ...item, db_id: savedDevelopmentIds[index] || "" })),
        bantuan: (data.bantuan as Array<Record<string, unknown>>).map((item, index) => ({ ...item, db_id: savedAidIds[index] || "" })),
      };
      writeSessionData("si-inuk-lks-pm", persistedData);
      setPembinaanRecords((records) => records.map((record, index) => ({ ...record, dbId: savedDevelopmentIds[index] || record.dbId })));
      setBantuanRecords((records) => records.map((record, index) => ({ ...record, dbId: savedAidIds[index] || record.dbId })));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      alert(`Gagal menyimpan data PM: ${message}`);
      return false;
    } finally {
      isSaving.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const saved = await persistPm();
    if (!saved) return;

    alert(
     "Data PM dan file BNBA berhasil tersimpan di Supabase.",
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

    const saved = await persistPm();
    if (!saved) return;

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

        <form key={backendLoaded ? "backend-loaded" : "local-cache"} onSubmit={handleSubmit} className="space-y-6">
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
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800"
            >
              Simpan Data
            </button>

            <button
              type="button"
              onClick={() => router.push("/lks/daftar/sdm")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali ke SDM
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
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
