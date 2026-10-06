"use client";



import dynamic from "next/dynamic";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { getIdentityData } from "../lk3/_lib/persistence";

import { LKS_STATUS_OPTIONS } from "../lks/_lib/lks";



const PsksMap = dynamic(() => import("./psks-map"), {

  ssr: false,

  loading: () => (

    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500">

      Memuat peta...

    </div>

  ),

});



type LksRow = {

  id: string;

  nama_lks: string;

  kecamatan: string | null;

  desa: string | null;

  status_lks: string | null;

  status_akreditasi: string | null;

  latitude: number | null;

  longitude: number | null;

};



type PmRow = {

  id: string;

  pm_id: string;

  tahun_data: string;

  pm_perempuan: number | string | null;

  pm_laki_laki: number | string | null;

  lks_id: string | null;

};



type TddRow = {

  lks_id: string | null;

  status_pengajuan: string | null;

  dokumen_tdd_file_name: string | null;

  dokumen_tdd_storage_path: string | null;

};



type FilterState = {

  kecamatan: string;

  statusLks: string;

  statusAkreditasi: string;

  tahunPm: string;

  tddStatus: string;

};



type ActiveTab = "Ringkasan" | "Peta Persebaran" | "Modul Aktif" | "LKS Terdata";



const psksModuleCatalog = [

  { name: "LKS", short: "Lembaga Kesejahteraan Sosial", href: "/lks", active: true },

  { name: "LK3", short: "Konsultasi Kesejahteraan Keluarga", href: "/lk3", active: true },

  { name: "TKSK", short: "Tenaga Kesejahteraan Sosial Kecamatan", href: "#", active: false },

  { name: "TAGANA", short: "Taruna Siaga Bencana", href: "#", active: false },

  { name: "Karang Taruna", short: "Organisasi kepemudaan sosial", href: "#", active: false },

  { name: "PSM", short: "Pekerja Sosial Masyarakat", href: "#", active: false },

];



function formatNumber(value: number | null | undefined) {

  if (value === null || value === undefined || Number.isNaN(value)) {

    return "Belum ada data";

  }



  return new Intl.NumberFormat("id-ID").format(value);

}



function normalizeText(value: string | null | undefined) {

  return typeof value === "string" ? value.trim() : "";

}

function buildSafeTddFileName(value: string) {
  const safeName = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return safeName || "tdd-resmi.pdf";
}



function BarChart({

  data,

  emptyMessage,

}: {

  data: { label: string; value: number }[];

  emptyMessage: string;

}) {

  const values = data.map((item) => item.value).filter((value) => Number.isFinite(value));

  const maxValue = values.length > 0 ? Math.max(...values, 0) : 0;



  if (!data.length || maxValue === 0) {

    return (

      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">

        {emptyMessage}

      </div>

    );

  }



  return (

    <div className="space-y-4">

      {data.map((item) => {

        const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

        return (

          <div key={item.label} className="space-y-2">

            <div className="flex items-center justify-between gap-3 text-sm">

              <span className="font-medium text-slate-700">{item.label}</span>

              <span className="text-slate-500">{formatNumber(item.value)}</span>

            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">

              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500" style={{ width: `${width}%` }} />

            </div>

          </div>

        );

      })}

    </div>

  );

}



function DonutChart({

  segments,

  emptyMessage,

}: {

  segments: { label: string; value: number; color: string }[];

  emptyMessage: string;

}) {

  const total = segments.reduce((sum, item) => sum + item.value, 0);



  if (!segments.length || total === 0) {

    return (

      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">

        {emptyMessage}

      </div>

    );

  }



  const renderedSegments = segments.reduce(

    (acc, segment) => {

      const strokeLength = (segment.value / total) * 100;

      acc.items.push({

        ...segment,

        dashArray: `${strokeLength} ${100 - strokeLength}`,

        dashOffset: -acc.cumulative,

      });

      acc.cumulative += strokeLength;

      return acc;

    },

    { cumulative: 0, items: [] as Array<{ label: string; value: number; color: string; dashArray: string; dashOffset: number }> },

  ).items;



  return (

    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">

      <div className="relative mx-auto h-44 w-44">

        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">

          {renderedSegments.map((segment) => (

            <circle

              key={segment.label}

              cx="60"

              cy="60"

              r="42"

              fill="none"

              stroke={segment.color}

              strokeWidth="18"

              strokeDasharray={segment.dashArray}

              strokeDashoffset={segment.dashOffset}

              strokeLinecap="round"

            />

          ))}

        </svg>



        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">

          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total</span>

          <span className="text-2xl font-semibold text-slate-900">{formatNumber(total)}</span>

        </div>

      </div>



      <div className="flex-1 space-y-3">

        {segments.map((segment) => {

          const percent = total > 0 ? (segment.value / total) * 100 : 0;

          return (

            <div key={segment.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">

              <div className="flex items-center gap-3">

                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />

                <span className="text-sm font-medium text-slate-700">{segment.label}</span>

              </div>

              <div className="text-right text-sm text-slate-500">

                <div>{formatNumber(segment.value)}</div>

                <div>{percent.toFixed(1)}%</div>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}



function LineChart({

  data,

  emptyMessage,

}: {

  data: { label: string; value: number }[];

  emptyMessage: string;

}) {

  if (!data.length || data.every((item) => item.value === 0)) {

    return (

      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">

        {emptyMessage}

      </div>

    );

  }



  const maxValue = Math.max(...data.map((item) => item.value), 1);



  return (

    <div className="rounded-2xl bg-slate-50 p-4">

      <svg viewBox="0 0 500 220" className="h-[220px] w-full">

        {[0, 1, 2, 3].map((step) => {

          const y = 20 + step * 45;

          return <line key={step} x1="30" x2="470" y1={y} y2={y} stroke="#cbd5e1" strokeDasharray="4 6" />;

        })}



        <polyline

          fill="none"

          stroke="#0ea5e9"

          strokeWidth="4"

          strokeLinejoin="round"

          strokeLinecap="round"

          points={data

            .map((point, index) => {

              const x = 40 + (index * 430) / Math.max(data.length - 1, 1);

              const y = 180 - (point.value / maxValue) * 130;

              return `${x},${y}`;

            })

            .join(" ")}

        />



        {data.map((point, index) => {

          const x = 40 + (index * 430) / Math.max(data.length - 1, 1);

          const y = 180 - (point.value / maxValue) * 130;

          return (

            <g key={`${point.label}-${index}`}>

              <circle cx={x} cy={y} r="5" fill="#0ea5e9" />

              <text x={x} y="205" textAnchor="middle" fill="#475569" fontSize="10">

                {point.label}

              </text>

              <text x={x} y={y - 12} textAnchor="middle" fill="#0f172a" fontSize="10">

                {point.value}

              </text>

            </g>

          );

        })}

      </svg>

    </div>

  );

}



export default function SiInukDashboard() {

  const router = useRouter();

  const [filters, setFilters] = useState<FilterState>({

    kecamatan: "Semua",

    statusLks: "Semua",

    statusAkreditasi: "Semua",

    tahunPm: "Semua",

    tddStatus: "Semua",

  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [lksRows, setLksRows] = useState<LksRow[]>([]);

  const [pmRows, setPmRows] = useState<PmRow[]>([]);

  const [tddRows, setTddRows] = useState<TddRow[]>([]);

  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const [coverage, setCoverage] = useState({

    legalitas: 0,

    sdm: 0,

    layanan: 0,

    sarpras: 0,

  });

  const [catalog, setCatalog] = useState({

    kecamatan: [] as string[],

    statusLks: [] as string[],

    statusAkreditasi: [] as string[],

    tahunPm: [] as string[],

    tddStatus: [] as string[],

  });

  const [selectedLksId, setSelectedLksId] = useState<string>("");

  const [lk3, setLk3] = useState(() => getIdentityData());

  const [activeTab, setActiveTab] = useState<ActiveTab>("Ringkasan");

  const [showPmAnalytics, setShowPmAnalytics] = useState(false);

  const [legalitasLksIds, setLegalitasLksIds] = useState<Set<string>>(new Set());
  const [tddUploadLksId, setTddUploadLksId] = useState<string>("");
  const [tddUploadFile, setTddUploadFile] = useState<File | null>(null);
  const [tddUploadBusy, setTddUploadBusy] = useState(false);



  useEffect(() => {

    const updateLk3 = () => setLk3(getIdentityData());

    updateLk3();

    window.addEventListener("storage", updateLk3);

    return () => window.removeEventListener("storage", updateLk3);

  }, []);



  useEffect(() => {

    let cancelled = false;



    async function loadDashboardData() {

      setLoading(true);

      setError(null);



      const client = createClient();

      const [lksResult, tddResult, pmParentResult, legalitasResult, sdmResult, layananResult, sarprasResult] = await Promise.all([

        client.from("lks").select("id,nama_lks,kecamatan,desa,status_lks,status_akreditasi,latitude,longitude"),

        client

  .from("lks_tanda_daftar")

  .select("lks_id,status_pengajuan,dokumen_tdd_file_name,dokumen_tdd_storage_path"),

        client.from("lks_pm").select("id,lks_id"),

        client.from("lks_legalitas").select("lks_id"),

        client.from("lks_sdm").select("lks_id"),

        client.from("lks_layanan").select("lks_id"),

        client.from("lks_sarpras").select("lks_id"),

      ]);



      if (cancelled) return;



      const queryError = lksResult.error || tddResult.error || pmParentResult.error || legalitasResult.error || sdmResult.error || layananResult.error || sarprasResult.error;

      if (queryError) {

        setError(`Gagal memuat data Supabase: ${queryError.message}`);

        setLksRows([]);

        setTddRows([]);

        setPmRows([]);

        setLoading(false);

        return;

      }



      const pmParents = pmParentResult.data ?? [];

      const pmResult = pmParents.length

        ? await client

            .from("lks_pm_penerima_manfaat")

            .select("id,pm_id,tahun_data,pm_perempuan,pm_laki_laki")

            .in("pm_id", pmParents.map((row) => row.id))

        : { data: [], error: null };



      if (cancelled) return;

      if (pmResult.error) {

        setError(`Gagal memuat data Penerima Manfaat dari Supabase: ${pmResult.error.message}`);

        setLoading(false);

        return;

      }



      const allLksRows = (lksResult.data ?? []) as LksRow[];

      const allTddRows = (tddResult.data ?? []) as TddRow[];

      const pmLksIds = new Map(pmParents.map((row) => [row.id, row.lks_id]));

      const allPmRows: PmRow[] = (pmResult.data ?? []).map((row) => ({

        ...row,

        lks_id: pmLksIds.get(row.pm_id) ?? null,

      })) as PmRow[];

      const matchingLks = allLksRows.filter((row) =>

        (filters.kecamatan === "Semua" || row.kecamatan === filters.kecamatan) &&

        (filters.statusLks === "Semua" || row.status_lks === filters.statusLks) &&

        (filters.statusAkreditasi === "Semua" || row.status_akreditasi === filters.statusAkreditasi) &&

        (filters.tddStatus === "Semua" || allTddRows.some((item) => item.lks_id === row.id && item.status_pengajuan === filters.tddStatus)),

      );

      const years = Array.from(new Set(allPmRows.map((row) => row.tahun_data).filter(Boolean))).sort();



      setCatalog({

        kecamatan: Array.from(new Set(allLksRows.map((row) => row.kecamatan).filter((value): value is string => Boolean(value)))),

        statusLks: Array.from(new Set([...LKS_STATUS_OPTIONS, ...allLksRows.map((row) => row.status_lks).filter((value): value is string => Boolean(value))])),

        statusAkreditasi: Array.from(new Set(allLksRows.map((row) => row.status_akreditasi).filter((value): value is string => Boolean(value)))),

        tahunPm: years,

        tddStatus: Array.from(new Set(allTddRows.map((row) => row.status_pengajuan).filter((value): value is string => Boolean(value)))),

      });

      setLksRows(matchingLks);

      setTddRows(allTddRows);

      setPmRows(allPmRows);

      setAvailableYears(years);

      setCoverage({

        legalitas: new Set((legalitasResult.data ?? []).map((row) => row.lks_id)).size,

        sdm: new Set((sdmResult.data ?? []).map((row) => row.lks_id)).size,

        layanan: new Set((layananResult.data ?? []).map((row) => row.lks_id)).size,

        sarpras: new Set((sarprasResult.data ?? []).map((row) => row.lks_id)).size,

      });

      setLegalitasLksIds(new Set((legalitasResult.data ?? []).map((row) => row.lks_id)));

      setSelectedLksId((current) => matchingLks.some((row) => row.id === current) ? current : matchingLks[0]?.id ?? "");
      setTddUploadLksId((current) => matchingLks.some((row) => row.id === current) ? current : matchingLks[0]?.id ?? "");

      setLoading(false);

    }



    void loadDashboardData();

    return () => {

      cancelled = true;

    };

  }, [filters.kecamatan, filters.statusLks, filters.statusAkreditasi, filters.tddStatus]);



  const kecamatanOptions = useMemo(() => ["Semua", ...catalog.kecamatan], [catalog.kecamatan]);



  const statusLksOptions = useMemo(() => ["Semua", ...catalog.statusLks], [catalog.statusLks]);



  const statusAkreditasiOptions = useMemo(() => ["Semua", ...catalog.statusAkreditasi], [catalog.statusAkreditasi]);



  const tddStatusOptions = useMemo(() => ["Semua", ...catalog.tddStatus], [catalog.tddStatus]);



  const tddStatusMap = useMemo(

    () =>

      new Map(

        tddRows

          .map((row) => [String(row.lks_id ?? ""), normalizeText(row.status_pengajuan)] as [string, string])

          .filter(([key]) => Boolean(key)),

      ),

    [tddRows],

  );



  const pmRowsForSelectedYear = useMemo(() => {

    if (filters.tahunPm === "Semua" || !filters.tahunPm) {

      return pmRows;

    }



    return pmRows.filter((row) => row.tahun_data === filters.tahunPm);

  }, [filters.tahunPm, pmRows]);



  const totalPm = useMemo(() => {

    return pmRowsForSelectedYear.reduce((sum, row) => sum + Number(row.pm_perempuan ?? 0) + Number(row.pm_laki_laki ?? 0), 0);

  }, [pmRowsForSelectedYear]);



  const totalTddDiajukan = useMemo(

    () => tddRows.filter((row) => normalizeText(row.status_pengajuan) === "DIAJUKAN").length,

    [tddRows],

  );



  const totalTddDraft = useMemo(

    () => tddRows.filter((row) => normalizeText(row.status_pengajuan) === "DRAFT").length,

    [tddRows],

  );



  const tddStatusData = useMemo(() => {

    const groups = new Map<string, number>();



    tddRows.forEach((row) => {

      const key = normalizeText(row.status_pengajuan) || "Belum ada data";

      groups.set(key, (groups.get(key) ?? 0) + 1);

    });



    return Array.from(groups.entries())

      .map(([label, value]) => ({ label, value }))

      .sort((a, b) => a.label.localeCompare(b.label, "id"));

  }, [tddRows]);



  const totalPerempuan = useMemo(() => {

    return pmRowsForSelectedYear.reduce((sum, row) => sum + Number(row.pm_perempuan ?? 0), 0);

  }, [pmRowsForSelectedYear]);



  const totalLakiLaki = useMemo(() => {

    return pmRowsForSelectedYear.reduce((sum, row) => sum + Number(row.pm_laki_laki ?? 0), 0);

  }, [pmRowsForSelectedYear]);



  const pmTrendData = useMemo(() => {

    const groups = new Map<string, number>();

    const sourceRows = filters.tahunPm === "Semua" || !filters.tahunPm ? pmRows : pmRowsForSelectedYear;



    sourceRows.forEach((row) => {

      const year = normalizeText(row.tahun_data) || "Belum ada data";

      const total = Number(row.pm_perempuan ?? 0) + Number(row.pm_laki_laki ?? 0);

      groups.set(year, (groups.get(year) ?? 0) + total);

    });



    return Array.from(groups.entries())

      .map(([label, value]) => ({ label, value }))

      .sort((a, b) => Number(a.label) - Number(b.label));

  }, [filters.tahunPm, pmRows, pmRowsForSelectedYear]);



  const lksByKecamatan = useMemo(() => {

    const groups = new Map<string, number>();

    lksRows.forEach((row) => {

      const key = normalizeText(row.kecamatan) || "Belum ada data";

      groups.set(key, (groups.get(key) ?? 0) + 1);

    });



    return Array.from(groups.entries())

      .map(([label, value]) => ({ label, value }))

      .sort((a, b) => a.label.localeCompare(b.label, "id"));

  }, [lksRows]);



  const lksByStatus = useMemo(() => {

    const groups = new Map<string, number>();

    lksRows.forEach((row) => {

      const key = normalizeText(row.status_lks) || "Belum ada data";

      groups.set(key, (groups.get(key) ?? 0) + 1);

    });



    return Array.from(groups.entries())

      .map(([label, value]) => ({ label, value }))

      .sort((a, b) => a.label.localeCompare(b.label, "id"));

  }, [lksRows]);



  const lksByAkreditasi = useMemo(() => {

    const groups = new Map<string, number>();

    lksRows.forEach((row) => {

      const key = normalizeText(row.status_akreditasi) || "Belum ada data";

      groups.set(key, (groups.get(key) ?? 0) + 1);

    });



    return Array.from(groups.entries())

      .map(([label, value]) => ({ label, value }))

      .sort((a, b) => a.label.localeCompare(b.label, "id"));

  }, [lksRows]);



  const mapRecords = useMemo(() => {

    if (lksRows.length === 0) return [];



    return lksRows.map((row) => ({

      id: row.id,

      type: "LKS" as const,

      label: row.nama_lks,

      detail: [row.desa, row.kecamatan, row.status_lks].filter(Boolean).join(" · "),

      query: [row.desa, row.kecamatan, row.status_lks, "Manggarai Barat", "Indonesia"].filter(Boolean).join(", "),

      latitude: row.latitude ?? undefined,

      longitude: row.longitude ?? undefined,

    }));

  }, [lksRows]);



  const moduleLinks = useMemo(() => {

    const hasRealLks = lksRows.length > 0;

    const hasRealLk3 = Boolean(lk3.namaKetua || lk3.email || lk3.nomorSk || lk3.nomorKontak);



    return psksModuleCatalog.map((module) => ({

      ...module,

      description:

        module.name === "LKS"

          ? hasRealLks

            ? `Data aktif: ${lksRows.length} LKS terdata`

            : "Modul tersedia, belum ada data LKS tersimpan."

          : module.name === "LK3"

            ? hasRealLk3

              ? `Data aktif: ${lk3.namaKetua || lk3.statusLk3 || "LK3 tersimpan"}`

              : "Modul tersedia, belum ada data LK3 tersimpan."

            : "Modul PSKS disiapkan untuk pengembangan berikutnya.",

    }));

  }, [lk3, lksRows]);



  const chosenLks = useMemo(() => {

    return lksRows.find((row) => row.id === selectedLksId) ?? lksRows[0] ?? null;

  }, [lksRows, selectedLksId]);



  const selectedLksPmRows = useMemo(() => {

    if (!chosenLks) {

      return [];

    }



    const rows = pmRows.filter((row) => row.lks_id === chosenLks.id);

    if (filters.tahunPm === "Semua" || !filters.tahunPm) {

      return rows;

    }



    return rows.filter((row) => row.tahun_data === filters.tahunPm);

  }, [chosenLks, filters.tahunPm, pmRows]);



  const selectedLksTotalPm = selectedLksPmRows.reduce(

    (sum, row) => sum + Number(row.pm_perempuan ?? 0) + Number(row.pm_laki_laki ?? 0),

    0,

  );

  const selectedLksPerempuan = selectedLksPmRows.reduce((sum, row) => sum + Number(row.pm_perempuan ?? 0), 0);

  const selectedLksLakiLaki = selectedLksPmRows.reduce((sum, row) => sum + Number(row.pm_laki_laki ?? 0), 0);



  const individualSummary = chosenLks

    ? {

        nama: chosenLks.nama_lks,

        statusLks: chosenLks.status_lks || "Belum ada data",

        statusAkreditasi: chosenLks.status_akreditasi || "Belum ada data",

        totalPm: selectedLksPmRows.length > 0 ? selectedLksTotalPm : null,

        perempuan: selectedLksPmRows.length > 0 ? selectedLksPerempuan : null,

        lakiLaki: selectedLksPmRows.length > 0 ? selectedLksLakiLaki : null,

      }

    : null;



  const reportRows = useMemo(() => {

    return lksRows.map((row) => {

      const pmForLks = pmRows.filter((item) => item.lks_id === row.id);

      const total = pmForLks.reduce((sum, item) => sum + Number(item.pm_perempuan ?? 0) + Number(item.pm_laki_laki ?? 0), 0);

      const perempuan = pmForLks.reduce((sum, item) => sum + Number(item.pm_perempuan ?? 0), 0);

      const laki = pmForLks.reduce((sum, item) => sum + Number(item.pm_laki_laki ?? 0), 0);

      const tddStatus = tddStatusMap.get(row.id) ?? "Belum ada data";



      return {

        nama_lks: row.nama_lks,

        kecamatan: row.kecamatan ?? "",

        desa: row.desa ?? "",

        status_lks: row.status_lks ?? "",

        status_akreditasi: row.status_akreditasi ?? "",

        tdd_status: tddStatus,

        total_pm: total,

        pm_perempuan: perempuan,

        pm_laki_laki: laki,

      };

    });

  }, [lksRows, pmRows, tddStatusMap]);



  const handleUploadOfficialTdd = async () => {
    if (!tddUploadLksId) {
      alert("Pilih LKS terlebih dahulu.");
      return;
    }

    if (!tddUploadFile) {
      alert("Pilih file TDD resmi dalam format PDF.");
      return;
    }

    const isPdf = tddUploadFile.type === "application/pdf" || /\.pdf$/i.test(tddUploadFile.name);
    if (!isPdf) {
      alert("File TDD resmi harus berformat PDF.");
      return;
    }

    setTddUploadBusy(true);

    try {
      const client = createClient();
      const { data: { user }, error: userError } = await client.auth.getUser();

      if (userError || !user) {
        throw new Error("Sesi admin tidak ditemukan. Silakan login kembali.");
      }

      const safeFileName = buildSafeTddFileName(tddUploadFile.name);
      const storagePath = [tddUploadLksId, "tanda-daftar", "tdd_resmi", safeFileName].join("/");

      const { error: uploadError } = await client.storage
        .from("lks-documents")
        .upload(storagePath, tddUploadFile, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        throw new Error(`Gagal mengunggah TDD resmi: ${uploadError.message}`);
      }

      const { data: updatedTdd, error: updateError } = await client
        .from("lks_tanda_daftar")
        .update({
          status_pengajuan: "TERBIT",
          dokumen_tdd_file_name: tddUploadFile.name,
          dokumen_tdd_storage_path: storagePath,
          dokumen_tdd_uploaded_at: new Date().toISOString(),
          dokumen_tdd_uploaded_by: user.id,
        })
        .eq("lks_id", tddUploadLksId)
        .select("lks_id,status_pengajuan,dokumen_tdd_file_name,dokumen_tdd_storage_path")
        .maybeSingle();

      if (updateError) {
        throw new Error(`Gagal memperbarui status TDD: ${updateError.message}`);
      }

      if (!updatedTdd) {
        throw new Error("Data pengajuan TDD untuk LKS tersebut tidak ditemukan.");
      }

      setTddRows((current) =>
        current.map((row) =>
          row.lks_id === tddUploadLksId
            ? {
                ...row,
                status_pengajuan: "TERBIT",
                dokumen_tdd_file_name: tddUploadFile.name,
                dokumen_tdd_storage_path: storagePath,
              }
            : row,
        ),
      );
      setTddUploadFile(null);
      alert("TDD resmi berhasil diunggah. Status TDD menjadi TERBIT.");
    } catch (uploadError) {
      alert(uploadError instanceof Error ? uploadError.message : "Gagal mengunggah TDD resmi.");
    } finally {
      setTddUploadBusy(false);
    }
  };

  const exportCsvReport = () => {

    if (typeof window === "undefined") return;



    const rows = [

      ["Nama LKS", "Kecamatan", "Desa", "Status LKS", "Status Akreditasi", "Status TDD", "Total PM", "PM Perempuan", "PM Laki-laki"],

      ...reportRows.map((row) => [

        row.nama_lks,

        row.kecamatan,

        row.desa,

        row.status_lks,

        row.status_akreditasi,

        row.tdd_status,

        String(row.total_pm),

        String(row.pm_perempuan),

        String(row.pm_laki_laki),

      ]),

    ];



    const csv = rows

      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))

      .join("\n");



    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "laporan-si-inuk-db.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  };



  const exportPdfReport = () => {

    if (typeof window === "undefined") return;



    const html = `

      <html>

        <head>

          <title>Laporan SI-INUK</title>

          <style>

            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }

            h1 { margin-bottom: 8px; }

            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }

            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }

            th { background: #e0f2fe; }

            .meta { color: #475569; font-size: 12px; margin-bottom: 12px; }

          </style>

        </head>

        <body>

          <h1>Laporan SI-INUK</h1>

          <div class="meta">Filter aktif: Kecamatan ${filters.kecamatan}, Status LKS ${filters.statusLks}, Akreditasi ${filters.statusAkreditasi}, TDD ${filters.tddStatus}, Tahun PM ${filters.tahunPm}</div>

          <table>

            <thead>

              <tr>

                <th>Nama LKS</th>

                <th>Kecamatan</th>

                <th>Desa</th>

                <th>Status LKS</th>

                <th>Akreditasi</th>

                <th>Status TDD</th>

                <th>Total PM</th>

                <th>Perempuan</th>

                <th>Laki-laki</th>

              </tr>

            </thead>

            <tbody>

              ${reportRows

                .map(

                  (row) => `

                    <tr>

                      <td>${row.nama_lks}</td>

                      <td>${row.kecamatan}</td>

                      <td>${row.desa}</td>

                      <td>${row.status_lks}</td>

                      <td>${row.status_akreditasi}</td>

                      <td>${row.tdd_status}</td>

                      <td>${row.total_pm}</td>

                      <td>${row.pm_perempuan}</td>

                      <td>${row.pm_laki_laki}</td>

                    </tr>

                  `,

                )

                .join("") || `<tr><td colspan="9">Tidak ada data yang sesuai dengan filter.</td></tr>`}

            </tbody>

          </table>

        </body>

      </html>

    `;



    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {

      alert("Pop-up laporan diblokir. Izinkan pop-up untuk mencetak PDF.");

      return;

    }



    printWindow.document.open();

    printWindow.document.write(html);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {

      printWindow.print();

    }, 300);

  };



  const coverageChartData = [

    { label: "Legalitas", value: coverage.legalitas },

    { label: "SDM", value: coverage.sdm },

    { label: "Layanan", value: coverage.layanan },

    { label: "Sarpras", value: coverage.sarpras },

  ];



  const sidebarItems = [

    { name: "Ringkasan", label: "01" },

    { name: "Peta Persebaran", label: "02" },

    { name: "Modul Aktif", label: "03" },

    { name: "LKS Terdata", label: "04" },

  ];



  return (

    <div className="min-h-screen bg-slate-100 text-slate-900">

      <div className="mx-auto flex min-h-screen max-w-[1680px]">

        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-[#10212b] px-4 py-6 text-slate-100 lg:flex">

          <div className="mb-10 flex items-center gap-3 px-2">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-lg font-black text-[#10212b] shadow-lg shadow-cyan-400/20">

              I

            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">SI-INUK</p>

              <h1 className="text-base font-semibold text-white">Pusat data</h1>

            </div>

          </div>



          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.06] p-3">

            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Status sistem</p>

            <div className="mt-2 flex items-center justify-between">

              <span className="text-xs font-medium text-slate-100">Terhubung ke data real</span>

              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />

            </div>

          </div>



          <nav className="space-y-1.5">

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Navigasi</p>

            {sidebarItems.map((item) => (

              <button

                key={item.name}

                type="button"

                onClick={() => setActiveTab(item.name as ActiveTab)}

                className={`group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium transition ${

                  activeTab === item.name ? "bg-white/[0.1] text-white" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"

                }`}

              >

                <span>{item.name}</span>

                <span className="text-[10px] text-slate-500 transition group-hover:text-cyan-300">{item.label}</span>

              </button>

            ))}

          </nav>



          <button

            type="button"

            onClick={() => router.push("/lks")}

            className="mt-auto rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] p-4 text-left transition hover:border-cyan-300/50 hover:bg-cyan-400/[0.14]"

          >

            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200">LKS terdata</p>

            <p className="mt-2 text-2xl font-semibold text-white">{lksRows.length > 0 ? formatNumber(lksRows.length) : "0"}</p>

            <p className="mt-1 text-xs text-slate-400">Mengikuti filter aktif</p>

          </button>

        </aside>



        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-10 lg:py-7">

          <nav className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 lg:hidden">

            {sidebarItems.map((item) => (

              <button key={item.name} type="button" onClick={() => setActiveTab(item.name as ActiveTab)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === item.name ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>

                {item.name}

              </button>

            ))}

          </nav>



          <header className="mb-6 border-b border-slate-200 pb-5">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-teal-700">Pusat kendali data</p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Statistik SI-INUK</h2>

                <p className="mt-2 text-sm text-slate-500">Pantau persebaran, kelengkapan, dan penerima manfaat dalam satu tampilan.</p>

              </div>



              <div className="flex flex-wrap items-center gap-2">

                <button

                  type="button"

                  onClick={exportPdfReport}

                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"

                >

                  🖨️ Export PDF

                </button>

                <button

                  type="button"

                  onClick={exportCsvReport}

                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110"

                >

                  📊 Export Excel

                </button>

                <button

                  type="button"

                  onClick={async () => {

                    await createClient().auth.signOut();

                    router.replace("/login");

                    router.refresh();

                  }}

                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100"

                >

                  ↩ Keluar

                </button>

              </div>

            </div>

          </header>



          <section id="overview" className="mb-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-teal-700">Data real</p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">{activeTab}</h3>

              </div>

              <div className="rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">

                {loading ? "Memuat data..." : lksRows.length > 0 ? `${lksRows.length} LKS terdata` : "Belum ada data"}

              </div>

            </div>

          </section>



          {error ? (

            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>

          ) : null}



          {activeTab === "Ringkasan" && showPmAnalytics ? (

            <section className="mb-6 grid gap-4 md:grid-cols-3">

              {[

                { label: "Total LKS", value: lksRows.length, hint: "Buka daftar LKS terdata", onClick: () => router.push("/lks"), tone: "from-sky-500 to-cyan-500" },

                { label: "Total PM", value: totalPm, hint: "Tampilkan statistik PM", onClick: () => setShowPmAnalytics((value) => !value), tone: "from-emerald-500 to-teal-500" },

                { label: "TDD Diajukan", value: totalTddDiajukan, hint: "Pengajuan tanda daftar", onClick: () => undefined, tone: "from-amber-500 to-orange-500" },

              ].map((card) => (

                <button key={card.label} type="button" onClick={card.onClick} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300">

                  <div className={`h-1.5 w-full bg-gradient-to-r ${card.tone}`} />

                  <div className="p-5">

                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">{card.label}</span>

                    <p className="mt-4 text-3xl font-bold text-slate-900">{formatNumber(card.value)}</p>

                    <p className="mt-2 text-sm text-slate-500">{card.hint}</p>

                  </div>

                </button>

              ))}

            </section>

          ) : null}



          {activeTab === "Ringkasan" ? (

          <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">

              <div className="mb-5 flex items-end justify-between gap-4">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-teal-700">Kelengkapan modul</p>

                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Kesiapan data LKS</h3>

                </div>

                <span className="text-xs text-slate-400">Jumlah LKS terisi</span>

              </div>

              <BarChart data={coverageChartData} emptyMessage="Belum ada data kelengkapan modul." />

            </div>



            <div className="rounded-2xl border border-slate-200 bg-[#10212b] p-5 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">

              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-300">Cakupan sistem</p>

              <h3 className="mt-2 text-xl font-semibold">Ekosistem PSKS</h3>

              <p className="mt-2 text-sm leading-6 text-slate-300">Seluruh modul ditampilkan sejak awal agar arah pengembangan dan cakupan layanan mudah dipahami.</p>

              <div className="mt-5 flex items-end gap-2">

                <span className="text-4xl font-semibold text-white">{psksModuleCatalog.length}</span>

                <span className="pb-1 text-sm text-slate-400">modul PSKS</span>

              </div>

              <div className="mt-4 flex flex-wrap gap-2">

                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">{psksModuleCatalog.filter((module) => module.active).length} aktif</span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{psksModuleCatalog.filter((module) => !module.active).length} disiapkan</span>

              </div>

            </div>

          </section>

          ) : null}



          {activeTab === "LKS Terdata" ? (
            <>
              <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-teal-700">Daftar lembaga</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">LKS Terdaftar</h3>
                  <p className="mt-1 text-sm text-slate-500">Daftar nama LKS beserta status akreditasi, legalitas, dan status TDD.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Nama LKS</th>
                        <th className="px-5 py-3 font-semibold">Wilayah</th>
                        <th className="px-5 py-3 font-semibold">Status LKS</th>
                        <th className="px-5 py-3 font-semibold">Akreditasi</th>
                        <th className="px-5 py-3 font-semibold">Legalitas</th>
                        <th className="px-5 py-3 font-semibold">Status TDD</th>
                        <th className="px-5 py-3 font-semibold">Dokumen TDD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lksRows.length > 0 ? lksRows.map((row) => {
                        const tdd = tddRows.find((item) => item.lks_id === row.id);
                        const tddStatus = normalizeText(tdd?.status_pengajuan) || "Belum ada data";

                        return (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-semibold text-slate-800">{row.nama_lks}</td>
                            <td className="px-5 py-4 text-slate-600">{row.desa || "-"}, {row.kecamatan || "-"}</td>
                            <td className="px-5 py-4 text-slate-600">{row.status_lks || "Belum ada data"}</td>
                            <td className="px-5 py-4"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{row.status_akreditasi || "Belum ada data"}</span></td>
                            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${legalitasLksIds.has(row.id) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{legalitasLksIds.has(row.id) ? "Tersedia" : "Belum ada data"}</span></td>
                            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tddStatus === "TERBIT" ? "bg-emerald-50 text-emerald-700" : tddStatus === "DIAJUKAN" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{tddStatus}</span></td>
                            <td className="px-5 py-4 text-slate-600">{tdd?.dokumen_tdd_file_name || "Belum diunggah"}</td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Belum ada LKS terdaftar.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-teal-700">Verifikasi dan penerbitan</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Unggah Tanda Daftar Dinas resmi</h3>
                    <p className="mt-1 text-sm text-slate-500">Pilih LKS yang telah diverifikasi, lalu unggah TDD resmi dalam format PDF.</p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">Admin SI-INUK</span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    <span>Pilih LKS</span>
                    <select
                      value={tddUploadLksId}
                      onChange={(event) => setTddUploadLksId(event.target.value)}
                      disabled={tddUploadBusy || lksRows.length === 0}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {lksRows.length === 0 ? <option value="">Belum ada LKS</option> : null}
                      {lksRows.map((row) => (
                        <option key={row.id} value={row.id}>{row.nama_lks}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    <span>File TDD resmi (PDF)</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={tddUploadBusy}
                      onChange={(event) => setTddUploadFile(event.target.files?.[0] ?? null)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleUploadOfficialTdd}
                    disabled={tddUploadBusy || !tddUploadLksId || !tddUploadFile}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {tddUploadBusy ? "Mengunggah..." : "Terbitkan TDD"}
                  </button>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-400">File disimpan di Supabase Storage melalui SI-INUK. LKS tidak mengakses Storage secara langsung.</p>
              </section>
            </>
          ) : null}

          <section className={activeTab === "Ringkasan" && showPmAnalytics ? "mb-6 grid gap-6 xl:grid-cols-2" : "hidden"}>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Kecamatan</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Jumlah LKS per kecamatan</h3>

              </div>

              <BarChart data={lksByKecamatan} emptyMessage="Belum ada data LKS untuk kecamatan yang dipilih." />

            </div>



            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Status</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Status LKS</h3>

              </div>

              <BarChart data={lksByStatus} emptyMessage="Belum ada data status LKS." />

            </div>

          </section>



          <section className={activeTab === "Ringkasan" && showPmAnalytics ? "mb-6 grid gap-6 xl:grid-cols-2" : "hidden"}>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">TDD</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Status pengajuan TDD</h3>

              </div>

              <BarChart data={tddStatusData} emptyMessage="Belum ada data TDD untuk dashboard." />

            </div>



            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Ringkasan TDD</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Draft dan diajukan</h3>

              </div>

              <div className="space-y-3">

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Diajukan</p>

                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatNumber(totalTddDiajukan)}</p>

                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Draft</p>

                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatNumber(totalTddDraft)}</p>

                </div>

              </div>

            </div>

          </section>



          <section className={activeTab === "Ringkasan" && showPmAnalytics ? "mb-6 grid gap-6 xl:grid-cols-2" : "hidden"}>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Akreditasi</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Status akreditasi LKS</h3>

              </div>

              <BarChart data={lksByAkreditasi} emptyMessage="Belum ada data akreditasi." />

            </div>



            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Penerima manfaat</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">PM perempuan vs laki-laki</h3>

              </div>

              <DonutChart

                segments={[

                  { label: "Perempuan", value: totalPerempuan, color: "#ec4899" },

                  { label: "Laki-laki", value: totalLakiLaki, color: "#3b82f6" },

                ]}

                emptyMessage="Belum ada data PM untuk filter yang dipilih."

              />

            </div>

          </section>



          <section className={activeTab === "Ringkasan" && showPmAnalytics ? "mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]" : "hidden"}>

            <div className="mb-4">

              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Tren</p>

              <h3 className="mt-2 text-xl font-semibold text-slate-900">Tren PM berdasarkan tahun</h3>

            </div>

            <LineChart data={pmTrendData} emptyMessage="Belum ada data PM untuk membentuk tren." />

          </section>



          <section className="hidden">

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">LKS individual</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Detail LKS</h3>

              </div>



              {lksRows.length > 0 ? (

                <>

                  <label className="mb-4 flex flex-col gap-2 text-sm text-slate-600">

                    <span>Pilih LKS</span>

                    <select

                      value={chosenLks?.id ?? ""}

                      onChange={(event) => setSelectedLksId(event.target.value)}

                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white"

                    >

                      {lksRows.map((row) => (

                        <option key={row.id} value={row.id}>

                          {row.nama_lks}

                        </option>

                      ))}

                    </select>

                  </label>



                  {individualSummary ? (

                    <div className="space-y-3">

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Nama LKS</p>

                        <p className="mt-2 font-semibold text-slate-900">{individualSummary.nama}</p>

                      </div>



                      <div className="grid gap-3 sm:grid-cols-2">

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Status LKS</p>

                          <p className="mt-2 text-sm font-medium text-slate-800">{individualSummary.statusLks}</p>

                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Status Akreditasi</p>

                          <p className="mt-2 text-sm font-medium text-slate-800">{individualSummary.statusAkreditasi}</p>

                        </div>

                      </div>



                      <div className="grid gap-3 sm:grid-cols-3">

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Total PM</p>

                          <p className="mt-2 text-lg font-semibold text-slate-900">{individualSummary.totalPm !== null ? formatNumber(individualSummary.totalPm) : "Belum ada data PM"}</p>

                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">PM Perempuan</p>

                          <p className="mt-2 text-lg font-semibold text-slate-900">{individualSummary.perempuan !== null ? formatNumber(individualSummary.perempuan) : "Belum ada data"}</p>

                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">PM Laki-laki</p>

                          <p className="mt-2 text-lg font-semibold text-slate-900">{individualSummary.lakiLaki !== null ? formatNumber(individualSummary.lakiLaki) : "Belum ada data"}</p>

                        </div>

                      </div>

                    </div>

                  ) : (

                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">

                      Belum ada data PM untuk LKS terpilih.

                    </div>

                  )}

                </>

              ) : (

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">

                  Belum ada data LKS untuk filter yang dipilih.

                </div>

              )}

            </div>



            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">

              <div className="mb-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Ringkasan</p>

                <h3 className="mt-2 text-xl font-semibold text-slate-900">Statistik LKS individu</h3>

              </div>



              {chosenLks ? (

                <div className="space-y-4 text-sm text-slate-600">

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                    <p className="font-medium text-slate-800">Status LKS</p>

                    <p className="mt-2">{chosenLks.status_lks || "Belum ada data"}</p>

                  </div>



                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                    <p className="font-medium text-slate-800">Status Akreditasi</p>

                    <p className="mt-2">{chosenLks.status_akreditasi || "Belum ada data"}</p>

                  </div>



                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                    <p className="font-medium text-slate-800">Total PM</p>

                    <p className="mt-2">{selectedLksPmRows.length > 0 ? formatNumber(selectedLksTotalPm) : "Belum ada data PM"}</p>

                  </div>



                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                    <p className="font-medium text-slate-800">PM Perempuan / Laki-laki</p>

                    <p className="mt-2">{selectedLksPmRows.length > 0 ? `${formatNumber(selectedLksPerempuan)} / ${formatNumber(selectedLksLakiLaki)}` : "Belum ada data PM"}</p>

                  </div>



                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

                    <p className="font-medium text-slate-800">Kecamatan / Desa</p>

                    <p className="mt-2">{chosenLks.kecamatan || "Belum ada data"} / {chosenLks.desa || "Belum ada data"}</p>

                  </div>

                </div>

              ) : (

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">

                  Belum ada data LKS yang tersedia.

                </div>

              )}

            </div>

          </section>

        </main>

      </div>

    </div>

  );

}
