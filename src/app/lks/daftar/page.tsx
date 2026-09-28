"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import { LKS_STATUS_OPTIONS } from "../_lib/lks";
import {
  getSessionSnapshot,
  readSessionData,
  writeSessionData,
} from "./_lib/persistence";
import { createClient } from "@/lib/supabase/client";

const LocationPicker = dynamic(
  () => import("../../_components/location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-100 p-5 text-sm text-slate-500">
        Memuat peta lokasi...
      </div>
    ),
  },
);

type FieldName =
  | "nama_lks"
  | "kecamatan"
  | "desa"
  | "telepon"
  | "email"
  | "status_lks"
  | "status_akreditasi"
  | "latitude"
  | "longitude";

type FormErrors = Partial<Record<FieldName, string>>;

const statusOptions = [...LKS_STATUS_OPTIONS];

function normalizeText(
  value: FormDataEntryValue | string | null | undefined,
): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateLksForm(
  data: Record<string, string>,
  latitude: string,
  longitude: string,
): FormErrors {
  const errors: FormErrors = {};

  if (!normalizeText(data.nama_lks)) {
    errors.nama_lks = "Nama LKS wajib diisi.";
  } else if (normalizeText(data.nama_lks).length < 3) {
    errors.nama_lks = "Nama LKS minimal 3 karakter.";
  }

  if (!normalizeText(data.kecamatan)) {
    errors.kecamatan = "Kecamatan wajib dipilih.";
  }

  if (!normalizeText(data.desa)) {
    errors.desa = "Desa/Kelurahan wajib dipilih.";
  }

  if (
    data.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    errors.email = "Format email tidak valid.";
  }

  if (
    data.telepon &&
    !/^[0-9+()\-\s]{7,20}$/.test(data.telepon)
  ) {
    errors.telepon = "Nomor telepon tidak valid.";
  }

  if (!normalizeText(data.status_lks)) {
    errors.status_lks = "Status LKS wajib dipilih.";
  }

  if (!normalizeText(data.status_akreditasi)) {
    errors.status_akreditasi = "Status akreditasi wajib dipilih.";
  }

  if (
    latitude &&
    (Number(latitude) < -90 ||
      Number(latitude) > 90 ||
      Number.isNaN(Number(latitude)))
  ) {
    errors.latitude = "Latitude harus berada di rentang -90 sampai 90.";
  }

  if (
    longitude &&
    (Number(longitude) < -180 ||
      Number(longitude) > 180 ||
      Number.isNaN(Number(longitude)))
  ) {
    errors.longitude = "Longitude harus berada di rentang -180 sampai 180.";
  }

  return errors;
}

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

export default function DaftarLksPage() {
  const router = useRouter();
  const isSubmitting = useRef(false);

  const savedSnapshot = useSyncExternalStore(
    () => () => {},
    () => getSessionSnapshot("si-inuk-lks-identitas"),
    () => "",
  );

  const savedData = savedSnapshot
    ? readSessionData<Record<string, string>>(
        "si-inuk-lks-identitas",
        {},
      )
    : {};

  const [backendData, setBackendData] = useState<Record<string, string>>({});
  const [backendLoaded, setBackendLoaded] = useState(false);

  const effectiveSavedData = {
    ...savedData,
    ...backendData,
  };

  const [kecamatan, setKecamatan] = useState<string>(
    () => effectiveSavedData.kecamatan ?? "",
  );

  const [desa, setDesa] = useState<string>(
    () => effectiveSavedData.desa ?? "",
  );

  const [coordinates, setCoordinates] = useState({
    latitude: effectiveSavedData.latitude ?? "",
    longitude: effectiveSavedData.longitude ?? "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  /*
   * Memuat identitas LKS dari Supabase.
   *
   * Untuk akun role "lks", sumber lks_id utama adalah profiles.lks_id.
   * Ini penting agar akun LKS tidak membuat UUID LKS baru.
   *
   * Untuk admin, alur lama tetap menggunakan lks_id dari session.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      const client = createClient();

      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setBackendLoaded(true);
        }
        return;
      }

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role,lks_id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profileError) {
        alert(
          `Gagal membaca profil pengguna dari Supabase: ${profileError.message}`,
        );
        setBackendLoaded(true);
        return;
      }

      let lksId = savedData.lks_id;

      if (profile?.role === "lks") {
        if (!profile.lks_id) {
          alert(
            "Akun LKS belum terhubung dengan data LKS. Hubungi administrator.",
          );
          setBackendLoaded(true);
          return;
        }

        lksId = profile.lks_id;
      }

      if (!lksId) {
        setBackendLoaded(true);
        return;
      }

      const { data, error } = await client
        .from("lks")
        .select(
          "id,nama_lks,status_lks,status_akreditasi,kecamatan,desa,alamat,latitude,longitude,email,telepon",
        )
        .eq("id", lksId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        alert(
          `Gagal memuat Identitas LKS dari Supabase: ${error.message}`,
        );
      } else if (data) {
        const remoteData: Record<string, string> = {
          lks_id: data.id,
          nama_lks: data.nama_lks,
          status_lks: data.status_lks,
          status_akreditasi: data.status_akreditasi || "",
          kecamatan: data.kecamatan || "",
          desa: data.desa || "",
          alamat: data.alamat || "",
          latitude:
            data.latitude === null ? "" : String(data.latitude),
          longitude:
            data.longitude === null ? "" : String(data.longitude),
          email: data.email || "",
          telepon: data.telepon || "",
        };

        setBackendData(remoteData);
        setKecamatan(remoteData.kecamatan);
        setDesa(remoteData.desa);

        setCoordinates({
          latitude: remoteData.latitude,
          longitude: remoteData.longitude,
        });

        const cachedIdentity = readSessionData<Record<string, string>>(
          "si-inuk-lks-identitas",
          {},
        );

        writeSessionData("si-inuk-lks-identitas", {
          ...cachedIdentity,
          ...remoteData,
        });
      }

      setBackendLoaded(true);
    }

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, [savedData.lks_id]);

  const effectiveKecamatan =
    kecamatan || effectiveSavedData.kecamatan || "";

  const effectiveDesa =
    desa || effectiveSavedData.desa || "";

  const locationQuery = [
    effectiveKecamatan,
    effectiveDesa,
  ]
    .filter(Boolean)
    .join(", ");

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (isSubmitting.current) {
      return;
    }

    const formData = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;

    const normalizedData: Record<string, string> = {
      ...formData,
      kecamatan: effectiveKecamatan,
      desa: effectiveDesa,
      alamat: locationQuery,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };

    const nextErrors = validateLksForm(
      normalizedData,
      coordinates.latitude,
      coordinates.longitude,
    );

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    isSubmitting.current = true;

    try {
      const client = createClient();

      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        alert("Sesi login tidak ditemukan. Silakan login kembali.");
        return;
      }

      /*
       * Ambil role dan lks_id langsung dari profiles.
       * Untuk akun LKS, ini menjadi sumber ID LKS yang utama.
       */
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role,lks_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        alert(
          `Gagal membaca profil pengguna: ${profileError.message}`,
        );
        return;
      }

      let lksId =
        effectiveSavedData.lks_id || crypto.randomUUID();

      if (profile?.role === "lks") {
        if (!profile.lks_id) {
          alert(
            "Akun LKS belum terhubung dengan data LKS. Hubungi administrator.",
          );
          return;
        }

        lksId = profile.lks_id;
      }

      const dataWithId = {
        ...normalizedData,
        lks_id: lksId,
      };

      const { data, error } = await client
        .from("lks")
        .upsert(
          {
            id: lksId,
            slug: `${normalizedData.nama_lks}-${lksId}`,
            nama_lks: normalizedData.nama_lks,
            status_lks: normalizedData.status_lks,
            status_akreditasi:
              normalizedData.status_akreditasi || null,
            kecamatan: normalizedData.kecamatan,
            desa: normalizedData.desa,
            alamat: normalizedData.alamat,
            latitude: normalizedData.latitude
              ? Number(normalizedData.latitude)
              : null,
            longitude: normalizedData.longitude
              ? Number(normalizedData.longitude)
              : null,
            email: normalizedData.email || null,
            telepon: normalizedData.telepon || null,
          },
          {
            onConflict: "id",
          },
        )
        .select("id")
        .single();

      if (error) {
        alert(
          `Gagal menyimpan Identitas LKS ke Supabase: ${error.message}`,
        );
        return;
      }

      writeSessionData("si-inuk-lks-identitas", {
        ...dataWithId,
        lks_id: data.id,
      });

      alert("Data Identitas LKS berhasil disimpan.");

      router.push("/lks/daftar/legalitas");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak diketahui.";

      alert(`Gagal menyimpan Identitas LKS: ${message}`);
    } finally {
      isSubmitting.current = false;
    }
  };

  const renderError = (field: FieldName) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-red-600">
        {errors[field]}
      </p>
    ) : null;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">
              SI-INUK
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Pendaftaran LKS
            </h1>

            <p className="mt-2 text-slate-600">
              Pendataan Lembaga Kesejahteraan Sosial Kabupaten
              Manggarai Barat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Halaman Utama
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            1
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Identitas LKS
            </h2>

            <p className="text-sm text-slate-500">
              Informasi dasar dan kedudukan administratif LKS
            </p>
          </div>
        </div>

        <form
          key={backendLoaded ? "backend-loaded" : "local-cache"}
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Data Identitas LKS
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Isikan data sesuai dokumen dan kondisi LKS yang
              sebenarnya.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nama LKS
              </label>

              <input
                name="nama_lks"
                defaultValue={effectiveSavedData.nama_lks || ""}
                aria-invalid={Boolean(errors.nama_lks)}
                type="text"
                placeholder="Masukkan nama Lembaga Kesejahteraan Sosial"
                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 ${
                  errors.nama_lks
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              />

              {renderError("nama_lks")}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kecamatan
              </label>

              <select
                name="kecamatan"
                aria-invalid={Boolean(errors.kecamatan)}
                value={effectiveKecamatan}
                onChange={(e) => {
                  setKecamatan(e.target.value);
                  setDesa("");

                  setErrors((prev) => ({
                    ...prev,
                    kecamatan: undefined,
                  }));
                }}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${
                  errors.kecamatan
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              >
                <option value="">
                  Pilih Kecamatan
                </option>

                {Object.keys(wilayah).map((nama) => (
                  <option key={nama} value={nama}>
                    {nama}
                  </option>
                ))}
              </select>

              {renderError("kecamatan")}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Desa/Kelurahan
              </label>

              <select
                name="desa"
                aria-invalid={Boolean(errors.desa)}
                value={effectiveDesa}
                onChange={(e) => {
                  setDesa(e.target.value);

                  setErrors((prev) => ({
                    ...prev,
                    desa: undefined,
                  }));
                }}
                disabled={!effectiveKecamatan}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 ${
                  errors.desa
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              >
                <option value="">
                  {effectiveKecamatan
                    ? "Pilih Desa/Kelurahan"
                    : "Pilih Kecamatan terlebih dahulu"}
                </option>

                {effectiveKecamatan &&
                  wilayah[effectiveKecamatan]?.map((nama) => (
                    <option key={nama} value={nama}>
                      {nama}
                    </option>
                  ))}
              </select>

              {renderError("desa")}
            </div>

            <LocationPicker
              query={locationQuery}
              coordinates={coordinates}
              onChange={(nextCoordinates) => {
                setCoordinates(nextCoordinates);
              }}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nomor Telepon
              </label>

              <input
                name="telepon"
                defaultValue={effectiveSavedData.telepon || ""}
                aria-invalid={Boolean(errors.telepon)}
                type="tel"
                placeholder="Nomor telepon LKS"
                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 ${
                  errors.telepon
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              />

              {renderError("telepon")}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                name="email"
                defaultValue={effectiveSavedData.email || ""}
                aria-invalid={Boolean(errors.email)}
                type="email"
                placeholder="Email LKS"
                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              />

              {renderError("email")}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status LKS
              </label>

              <select
                name="status_lks"
                defaultValue={effectiveSavedData.status_lks || ""}
                aria-invalid={Boolean(errors.status_lks)}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${
                  errors.status_lks
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              >
                <option value="">Pilih Status</option>

                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {renderError("status_lks")}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status Akreditasi
              </label>

              <select
                name="status_akreditasi"
                defaultValue={
                  effectiveSavedData.status_akreditasi || ""
                }
                aria-invalid={Boolean(
                  errors.status_akreditasi,
                )}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${
                  errors.status_akreditasi
                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                }`}
              >
                <option value="">
                  Pilih Status Akreditasi
                </option>

                <option value="AKREDITASI_A">
                  Akreditasi A
                </option>

                <option value="AKREDITASI_B">
                  Akreditasi B
                </option>

                <option value="AKREDITASI_C">
                  Akreditasi C
                </option>

                <option value="AKREDITASI_D">
                  Akreditasi D
                </option>

                <option value="TTA">
                  Tidak Terakreditasi (TTA)
                </option>

                <option value="TIDAK_MEMENUHI_STANDAR">
                  Tidak Memenuhi Standar
                </option>

                <option value="BELUM_MENGAJUKAN_AKREDITASI">
                  Belum Mengajukan Akreditasi
                </option>
              </select>

              {renderError("status_akreditasi")}
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Lanjut
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}