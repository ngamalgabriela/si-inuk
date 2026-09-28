"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getSessionSnapshot,
  subscribeSessionStorage,
  writeSessionData,
} from "../_lib/persistence";
import { getCurrentLksId } from "../_lib/registration";

const wilayah: Record<string, string[]> = {
  Komodo: [
    "Komodo",
    "Golo Mori",
    "Watu Nggelek",
    "Papagarang",
    "Gorontalo",
    "Pantar",
    "Pasir Panjang",
    "Seraya Maranu",
    "Macang Tanggar",
    "Golo Bilas",
    "Nggorang",
    "Warloka",
    "Pasir Putih",
    "Compang Longgo",
    "Batu Cermin",
    "Golo Pongkor",
    "Tiwu Nampar",
    "Labuan Bajo",
    "Wae Kelambu",
  ],
  Boleng: [
    "Pota Wangka",
    "Beo Sepang",
    "Mbuit",
    "Golo Ketak",
    "Sepang",
    "Pontianak",
    "Golo Sepang",
    "Batu Tiga",
    "Tanjung Boleng",
    "Golo Nobo",
    "Golo Lujang",
  ],
  "Sano Nggoang": [
    "Golo Kempo",
    "Wae Sano",
    "Golo Leleng",
    "Sano Nggoang",
    "Wae Lolos",
    "Poco Golo Kempo",
    "Golo Kondeng",
    "Golo Ndaring",
    "Pulau Nuncung",
    "Golo Sengang",
    "Golo Manting",
    "Golo Mbu",
    "Watu Panggal",
    "Mata Wae",
    "Nampar Macing",
  ],
  Mbeliling: [
    "Cunca Wulang",
    "Golo Ndoal",
    "Kempo",
    "Tondong Belang",
    "Watu Wangka",
    "Liang Ndara",
    "Golo Desat",
    "Cunca Lolos",
    "Golo Sembea",
    "Golo Damu",
    "Compang Liang Ndara",
    "Watu Galang",
    "Tiwu Riwung",
    "Wae Jare",
    "Golo Tantong",
  ],
  Lembor: [
    "Siru",
    "Poco Rutang",
    "Wae Wako",
    "Wae Kanta",
    "Golo Ndeweng",
    "Poco Dedeng",
    "Wae Bangka",
    "Ponto Ara",
    "Pondo",
    "Daleng",
    "Pong Majok",
    "Ngancar",
    "Liang Sola",
    "Wae Mowol",
    "Tangge",
  ],
  Welak: [
    "Galang",
    "Lale",
    "Golo Ndari",
    "Gurung",
    "Sewar",
    "Robo",
    "Pong Welak",
    "Watu Umpu",
    "Pengka",
    "Dunta",
    "Racang Welak",
    "Orong",
    "Semang",
    "Wewa",
    "Rehak",
    "Golo Ronggot",
  ],
  "Lembor Selatan": [
    "Watu Waja",
    "Suru Numbeng",
    "Kakor",
    "Benteng Tado",
    "Modo",
    "Lendong",
    "Watu Rambung",
    "Nanga Lili",
    "Watu Tiri",
    "Lalong",
    "Benteng Dewa",
    "Wae Mose",
    "Munting",
    "Repi",
    "Nanga Bere",
  ],
  Kuwus: [
    "Coal",
    "Benteng Suru",
    "Compang Suka",
    "Suka Kiong",
    "Lewur",
    "Golo Pua",
    "Sama",
    "Bangka Lewat",
    "Pangga",
    "Lawi",
    "Nantal",
    "Golo Ruu",
  ],
  Ndoso: [
    "Momol",
    "Pateng Lesu",
    "Raka",
    "Golo Rua",
    "Tentang",
    "Pong Narang",
    "Golo Bore",
    "Wae Buka",
    "Lumut",
    "Tehong",
    "Golo Keli",
    "Golo Poleng",
    "Waning",
    "Kasong",
    "Ndoso",
  ],
  "Macang Pacar": [
    "Mbakung",
    "Lewat",
    "Watu Manggar",
    "Sarae Naru",
    "Bari",
    "Nanga Kantor Barat",
    "Nggilat",
    "Raba",
    "Nanga Kantor",
    "Wontong",
    "Rokap",
    "Watu Baru",
    "Rego",
  ],
  "Kuwus Barat": [
    "Ranggu",
    "Compang Kules",
    "Sompang Kolang",
    "Wajur",
    "Tengku",
    "Golo Riwu",
    "Golo Lewe",
    "Kolang",
    "Tueng",
    "Golo Wedong",
  ],
  Pacar: [
    "Golo Lajang Barat",
    "Compang",
    "Kombo Tengah",
    "Waka",
    "Manong",
    "Pacar",
    "Kombo Selatan",
    "Loha",
    "Benteng Ndope",
    "Romang",
    "Pong Kolong",
    "Kombo",
    "Golo Lajang",
  ],
};

const jenisPelayanan = [
  "Rehabilitasi Sosial",
  "Jaminan Sosial",
  "Pemberdayaan Sosial",
  "Perlindungan Sosial",
];

const sasaranPelayanan = [
  "Perseorangan",
  "Keluarga",
  "Kelompok",
  "Masyarakat",
];

const permasalahanSosial = [
  "Kemiskinan",
  "Ketelantaran",
  "Disabilitas",
  "Keterpencilan",
  "Ketunaan Sosial dan Penyimpangan Perilaku",
  "Korban Bencana",
  "Korban Tindak Kekerasan, Eksploitasi dan Diskriminasi",
];

const sistemPelayanan = [
  "Dalam Lembaga",
  "Luar Lembaga",
  "Lainnya",
];

export default function LayananLksPage() {
  const router = useRouter();
  const lksId = getCurrentLksId();
  const isSaving = useRef(false);
  const [saving, setSaving] = useState(false);
  const [backendLoaded, setBackendLoaded] = useState(false);
  const [backendData, setBackendData] = useState<Record<string, string | string[]>>({});
  const [kecamatan, setKecamatan] = useState("");
  const [desa, setDesa] = useState("");
  const [wilayahTerpilih, setWilayahTerpilih] = useState<
    { kecamatan: string; desa: string }[]
  >([]);

  const savedSnapshot = useSyncExternalStore(
    subscribeSessionStorage,
    () => getSessionSnapshot("si-inuk-lks-layanan"),
    () => ""
  );

  let localSavedData: Record<string, string | string[]> = {};

  if (savedSnapshot) {
    try {
      localSavedData = JSON.parse(savedSnapshot) as Record<string, string | string[]>;
    } catch {
      localSavedData = {};
    }
  }
  const savedData = { ...localSavedData, ...backendData };

  const [draftData, setDraftData] = useState<
    Record<string, string | string[]>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function loadLayanan() {
      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const client = createClient();
      const parentResult = await client
        .from("lks_layanan")
        .select("id")
        .eq("lks_id", lksId)
        .maybeSingle();

      if (cancelled) return;
      if (parentResult.error) {
        alert(`Gagal memuat data Layanan dari Supabase: ${parentResult.error.message}`);
        setBackendLoaded(true);
        return;
      }
      if (!parentResult.data) {
        setBackendLoaded(true);
        return;
      }

      const layananId = parentResult.data.id;
      const [jenisResult, sasaranResult, permasalahanResult, sistemResult, wilayahResult] = await Promise.all([
        client.from("lks_layanan_jenis").select("jenis_pelayanan").eq("layanan_id", layananId),
        client.from("lks_layanan_sasaran").select("sasaran_pelayanan").eq("layanan_id", layananId),
        client.from("lks_layanan_permasalahan").select("permasalahan_sosial").eq("layanan_id", layananId),
        client.from("lks_layanan_sistem").select("sistem_pelayanan").eq("layanan_id", layananId),
        client.from("lks_layanan_wilayah").select("kecamatan,desa").eq("layanan_id", layananId),
      ]);

      if (cancelled) return;
      const queryError = jenisResult.error || sasaranResult.error || permasalahanResult.error || sistemResult.error || wilayahResult.error;
      if (queryError) {
        alert(`Gagal memuat rincian Layanan dari Supabase: ${queryError.message}`);
      } else {
        const wilayahRows = wilayahResult.data ?? [];
        const wilayah = wilayahRows.map((row) => ({ kecamatan: row.kecamatan, desa: row.desa }));
        setBackendData({
          jenis_pelayanan: (jenisResult.data ?? []).map((row) => row.jenis_pelayanan),
          sasaran_pelayanan: (sasaranResult.data ?? []).map((row) => row.sasaran_pelayanan),
          permasalahan_sosial: (permasalahanResult.data ?? []).map((row) => row.permasalahan_sosial),
          sistem_pelayanan: (sistemResult.data ?? []).map((row) => row.sistem_pelayanan),
          cakupan_wilayah: JSON.stringify(wilayah),
        });
        setWilayahTerpilih(wilayah);
      }

      setBackendLoaded(true);
    }

    void loadLayanan();
    return () => {
      cancelled = true;
    };
  }, [lksId]);

  const effectiveKecamatan =
    kecamatan ||
    (typeof savedData.kecamatan === "string" ? savedData.kecamatan : "");

  const effectiveDesa =
    desa ||
    (typeof savedData.desa === "string" ? savedData.desa : "");

  const getSavedValues = (key: string): string[] => {
    const value = draftData[key] ?? savedData[key];
    if (Array.isArray(value)) return value;
    return typeof value === "string" && value ? [value] : [];
  };

  const handleCheckboxChange = (
    key: string,
    value: string,
    checked: boolean,
  ) => {
    const currentValues = getSavedValues(key);

    const nextValues = checked
      ? currentValues.includes(value)
        ? currentValues
        : [...currentValues, value]
      : currentValues.filter((item) => item !== value);

    setDraftData((current) => ({
      ...current,
      [key]: nextValues,
    }));
  };

  const savedCakupan = (() => {
    const value = savedData.cakupan_wilayah;
    if (typeof value !== "string" || !value) return [];

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is { kecamatan: string; desa: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { kecamatan?: unknown }).kecamatan === "string" &&
          typeof (item as { desa?: unknown }).desa === "string"
      );
    } catch {
      return [];
    }
  })();

  const effectiveWilayahTerpilih =
    wilayahTerpilih.length > 0 ? wilayahTerpilih : savedCakupan;

  const collectLayananData = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const data: Record<string, string | string[]> = {};

    formData.forEach((value, key) => {
      if (value instanceof File) return;

      const existing = data[key];

      if (existing) {
        data[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        data[key] = value;
      }
    });

    data.cakupan_wilayah = JSON.stringify(effectiveWilayahTerpilih);
    return data;
  };

  const syncLayananChoices = async (
    client: ReturnType<typeof createClient>,
    layananId: string,
    table: "lks_layanan_jenis" | "lks_layanan_sasaran" | "lks_layanan_permasalahan" | "lks_layanan_sistem",
    column: string,
    values: string[],
  ) => {
    if (values.length) {
      const rows = values.map((value) => ({ layanan_id: layananId, [column]: value }));
      const { error } = await client.from(table).upsert(rows, { onConflict: `layanan_id,${column}` });
      if (error) return error.message;
    }

    const { data: existing, error: selectError } = await client
      .from(table)
      .select(`id,${column}`)
      .eq("layanan_id", layananId);
    if (selectError) return selectError.message;

    const selectedValues = new Set(values);
    for (const row of existing ?? []) {
      const item = row as unknown as Record<string, unknown>;
      if (!selectedValues.has(String(item[column]))) {
        const { error } = await client.from(table).delete().eq("id", String(item.id));
        if (error) return error.message;
      }
    }

    return null;
  };

  const persistLayanan = async (data: Record<string, string | string[]>) => {
    if (isSaving.current) return false;
    if (!lksId) {
      alert("ID LKS belum tersedia. Simpan Identitas LKS terlebih dahulu.");
      return false;
    }

    isSaving.current = true;
    setSaving(true);

    try {
      writeSessionData("si-inuk-lks-layanan", data);
      const client = createClient();
      const { data: parent, error: parentError } = await client
        .from("lks_layanan")
        .upsert({ lks_id: lksId }, { onConflict: "lks_id" })
        .select("id")
        .single();

      if (parentError) {
        alert(`Gagal menyimpan data induk Layanan ke Supabase: ${parentError.message}`);
        return false;
      }

      const choiceGroups = [
        ["lks_layanan_jenis", "jenis_pelayanan"],
        ["lks_layanan_sasaran", "sasaran_pelayanan"],
        ["lks_layanan_permasalahan", "permasalahan_sosial"],
        ["lks_layanan_sistem", "sistem_pelayanan"],
      ] as const;

      for (const [table, column] of choiceGroups) {
        const value = data[column];
        const values = Array.isArray(value) ? value : value ? [value] : [];
        const syncError = await syncLayananChoices(client, parent.id, table, column, values);
        if (syncError) {
          alert(`Gagal menyimpan ${column} ke Supabase: ${syncError}`);
          return false;
        }
      }

      const wilayah = effectiveWilayahTerpilih;
      if (wilayah.length) {
        const { error } = await client
          .from("lks_layanan_wilayah")
          .upsert(wilayah.map((item) => ({ layanan_id: parent.id, ...item })), {
            onConflict: "layanan_id,kecamatan,desa",
          });
        if (error) {
          alert(`Gagal menyimpan cakupan wilayah ke Supabase: ${error.message}`);
          return false;
        }
      }

      const { data: existingWilayah, error: wilayahError } = await client
        .from("lks_layanan_wilayah")
        .select("id,kecamatan,desa")
        .eq("layanan_id", parent.id);
      if (wilayahError) {
        alert(`Gagal memeriksa cakupan wilayah di Supabase: ${wilayahError.message}`);
        return false;
      }

      const selectedWilayah = new Set(wilayah.map((item) => `${item.kecamatan}\u0000${item.desa}`));
      for (const row of existingWilayah ?? []) {
        if (!selectedWilayah.has(`${row.kecamatan}\u0000${row.desa}`)) {
          const { error } = await client.from("lks_layanan_wilayah").delete().eq("id", row.id);
          if (error) {
            alert(`Gagal memperbarui cakupan wilayah di Supabase: ${error.message}`);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      alert(`Gagal menyimpan Layanan: ${message}`);
      return false;
    } finally {
      isSaving.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = collectLayananData(e.currentTarget);
    const saved = await persistLayanan(data);
    if (!saved) return;

    alert("Data Layanan tersimpan di Supabase.");
  };

  const handleNext = async () => {
    const form = document.getElementById(
      "layanan-form"
    ) as HTMLFormElement | null;

    if (!form) return;

    if (!form.reportValidity()) {
      return;
    }

    const kelompokWajib = [
      "jenis_pelayanan",
      "sasaran_pelayanan",
      "permasalahan_sosial",
      "sistem_pelayanan",
    ];

    for (const nama of kelompokWajib) {
      const terpilih = form.querySelector(
        `input[name="${nama}"]:checked`
      );

      if (!terpilih) {
        alert("Semua bagian Layanan wajib diisi.");
        return;
      }
    }

    if (effectiveWilayahTerpilih.length === 0) {
      alert("Cakupan wilayah pelayanan wajib diisi minimal satu wilayah.");
      return;
    }

    const saved = await persistLayanan(collectLayananData(form));
    if (!saved) return;

    router.push("/lks/daftar/tanda-daftar");
  };

  const tambahWilayah = () => {
    if (!kecamatan || !desa) return;

    const sudahAda = effectiveWilayahTerpilih.some(
      (item) => item.kecamatan === kecamatan && item.desa === desa,
    );

    if (sudahAda) return;

    setWilayahTerpilih([
      ...effectiveWilayahTerpilih,
      {
        kecamatan,
        desa,
      },
    ]);

    setDesa("");
  };

  const hapusWilayah = (index: number) => {
    setWilayahTerpilih(effectiveWilayahTerpilih.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">SI-INUK</p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pendaftaran LKS — Layanan
          </h1>

          <p className="mt-2 text-slate-600">
            Data jenis pelayanan, sasaran, permasalahan sosial, sistem
            pelayanan, dan cakupan wilayah pelayanan LKS.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            4
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Layanan</h2>

            <p className="text-sm text-slate-500">
              Karakteristik pelayanan dan cakupan wilayah LKS
            </p>
          </div>
        </div>

        <form key={backendLoaded ? "backend-loaded" : "local-cache"} id="layanan-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Jenis Pelayanan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih satu atau lebih jenis pelayanan yang diselenggarakan LKS.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {jenisPelayanan.map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="jenis_pelayanan"
                    value={item}
                    checked={getSavedValues("jenis_pelayanan").includes(item)}
                    onChange={(e) =>
                      handleCheckboxChange(
                        "jenis_pelayanan",
                        item,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Sasaran Pelayanan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih sasaran pelayanan yang ditangani oleh LKS.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {sasaranPelayanan.map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="sasaran_pelayanan"
                    value={item}
                    checked={getSavedValues("sasaran_pelayanan").includes(item)}
                    onChange={(e) =>
                      handleCheckboxChange(
                        "sasaran_pelayanan",
                        item,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Permasalahan Sosial yang Ditangani
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih permasalahan sosial yang menjadi fokus pelayanan LKS.
            </p>

            <div className="mt-5 grid gap-3">
              {permasalahanSosial.map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="permasalahan_sosial"
                    value={item}
                    checked={getSavedValues("permasalahan_sosial").includes(item)}
                    onChange={(e) =>
                      handleCheckboxChange(
                        "permasalahan_sosial",
                        item,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Sistem Pelayanan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih sistem pelayanan yang digunakan LKS.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {sistemPelayanan.map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="sistem_pelayanan"
                    value={item}
                    checked={getSavedValues("sistem_pelayanan").includes(item)}
                    onChange={(e) =>
                      handleCheckboxChange(
                        "sistem_pelayanan",
                        item,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Cakupan Wilayah Pelayanan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih Kecamatan terlebih dahulu, kemudian pilih Desa/Kelurahan
              yang menjadi cakupan pelayanan LKS.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="kecamatan"
                  className="block text-sm font-medium text-slate-700"
                >
                  Kecamatan
                </label>

                <select
                  id="kecamatan"
                  value={effectiveKecamatan}
                  onChange={(e) => {
                    setKecamatan(e.target.value);
                    setDesa("");
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Pilih Kecamatan</option>

                  {Object.keys(wilayah).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="desa"
                  className="block text-sm font-medium text-slate-700"
                >
                  Desa/Kelurahan
                </label>

                <select
                  id="desa"
                  value={effectiveDesa}
                  onChange={(e) => setDesa(e.target.value)}
                  disabled={!effectiveKecamatan}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">Pilih Desa/Kelurahan</option>

                  {effectiveKecamatan &&
                    wilayah[effectiveKecamatan].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={tambahWilayah}
              disabled={!kecamatan || !desa}
              className="mt-4 rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tambahkan Wilayah
            </button>

            {effectiveWilayahTerpilih.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-800">
                  Wilayah yang Dipilih
                </h3>

                <div className="mt-3 space-y-2">
                  {effectiveWilayahTerpilih.map((item, index) => (
                    <div
                      key={`${item.kecamatan}-${item.desa}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm text-slate-700">
                        {item.kecamatan} — {item.desa}
                      </span>

                      <button
                        type="button"
                        onClick={() => hapusWilayah(index)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-medium text-blue-900">Catatan</p>

            <p className="mt-1 text-sm text-blue-800">
              Pilihan layanan dapat lebih dari satu. Cakupan wilayah juga
              dapat mencakup lebih dari satu Desa/Kelurahan.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
  <button
    type="submit"
    disabled={saving}
    className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800"
  >
    Simpan Data Layanan
  </button>

  <button
    type="button"
    onClick={() => router.push("/lks/daftar/sarpras")}
    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
  >
    Kembali ke Sarpras
  </button>

  <button
    type="button"
    onClick={handleNext}
    disabled={saving}
    className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
  >
    Lanjut ke Tanda Daftar Dinas
  </button>
</div>
        </form>
      </div>
    </main>
  );
}