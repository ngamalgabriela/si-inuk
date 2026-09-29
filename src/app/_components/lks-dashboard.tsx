import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LksDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: lks } = await supabase
    .from("lks")
    .select(
      "id,nama_lks,kecamatan,desa,status_lks,workflow_status,updated_at",
    )
    .eq("created_by", user.id)
    .maybeSingle();

  const { data: tandaDaftar } = lks
    ? await supabase
        .from("lks_tanda_daftar")
        .select("status_pengajuan")
        .eq("lks_id", lks.id)
        .maybeSingle()
    : { data: null };

  const statusPengajuan =
    tandaDaftar?.status_pengajuan || lks?.workflow_status || "draft";

  const modules = [
    {
      title: "Identitas LKS",
      description: "Kelola identitas dan informasi utama LKS.",
      href: "/lks/daftar",
    },
    {
      title: "Legalitas",
      description: "Kelola data legalitas LKS.",
      href: "/lks/daftar/legalitas",
    },
    {
      title: "SDM",
      description: "Kelola data sumber daya manusia.",
      href: "/lks/daftar/sdm",
    },
    {
      title: "Layanan",
      description: "Kelola data layanan yang diberikan LKS.",
      href: "/lks/daftar/layanan",
    },
    {
      title: "Penerima Manfaat",
      description: "Kelola data penerima manfaat.",
      href: "/lks/daftar/pm",
    },
    {
      title: "Sarana & Prasarana",
      description: "Kelola data sarana dan prasarana.",
      href: "/lks/daftar/sarpras",
    },
    {
      title: "Tanda Daftar Dinas",
      description: "Kelola dan ajukan Tanda Daftar Dinas.",
      href: "/lks/daftar/tanda-daftar",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            SI-INUK • Portal LKS
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Dashboard LKS
          </h1>

          <p className="mt-2 text-slate-600">
            Kelola dan perbarui data LKS Anda melalui modul yang tersedia.
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                LKS Anda
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {lks?.nama_lks || "Data LKS belum tersedia"}
              </h2>

              {lks && (
                <p className="mt-2 text-sm text-slate-500">
                  {lks.desa || "-"}, {lks.kecamatan || "-"}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                Status LKS: {lks?.status_lks || "-"}
              </span>

              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                Pengajuan: {statusPengajuan}
              </span>
            </div>
          </div>
        </section>

        {!lks && (
          <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">
              Data LKS belum ditemukan
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              Silakan mulai mengisi identitas LKS terlebih dahulu.
            </p>

            <Link
              href="/lks/daftar"
              className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Mulai Isi Identitas LKS
            </Link>
          </section>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Modul LKS
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih modul yang ingin dikelola.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                  {module.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {module.description}
                </p>

                <span className="mt-5 inline-flex text-sm font-semibold text-slate-700">
                  Buka modul →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}