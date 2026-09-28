"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildLksArchiveFromSession } from "./daftar/_lib/attachments";
import {
  getLksSummary,
  getWorkflowStatusLabel,
  type LksRecord,
} from "./_lib/lks";
import { getCurrentLksId } from "./daftar/_lib/registration";

type LksData = LksRecord;

export default function LksPage() {
  const router = useRouter();

  const [lksRows, setLksRows] = useState<LksData[]>([]);
  const [localLksId, setLocalLksId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLks() {
      try {
        setLoading(true);
        setError(null);
        setLocalLksId(getCurrentLksId());

        const { data, error } = await createClient()
          .from("lks")
          .select("id,nama_lks,kecamatan,desa,alamat,status_lks,workflow_status,updated_at")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        if (!cancelled) {
          setLksRows((data ?? []) as LksData[]);
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal mengambil data LKS.",
          );
          setLoading(false);
        }
      }
    }

    void loadLks();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const downloadLksFile = async (data: LksData) => {
    const filenameBase =
      (data.nama_lks || "lks")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase() || "lks";

    try {
      const blob = await buildLksArchiveFromSession(data.nama_lks || "lks");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `${filenameBase}.zip`;

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);
    } catch {
      alert("Tidak ada file unggahan yang dapat diunduh untuk LKS ini.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              SI-INUK / LKS
            </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-4xl">
                Data LKS Tersimpan
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Halaman ini menampilkan data LKS yang dapat diakses oleh akun aktif melalui RLS.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Kembali ke Dashboard
          </Link>

          <Link
            href="/lks/daftar"
            className="inline-flex w-fit rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Tambah LKS
          </Link>
        </div>

        <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                Akses LKS
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Data LKS dari Supabase
              </h2>
            </div>

            <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              Terproteksi RLS
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="text-sm text-slate-500">
                Memuat data LKS...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8">
              <p className="text-sm font-semibold text-amber-800">
                {error}
              </p>

            </div>
          ) : lksRows.length > 0 ? (
            <>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-[0.12em] text-slate-400">
                      <th className="pb-3 font-semibold">Nama LKS</th>
                      <th className="pb-3 font-semibold">Wilayah</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Alamat</th>
                      <th className="pb-3 text-right font-semibold">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {lksRows.map((lks) => (
                      <tr key={lks.id} className="border-b border-slate-100">
                        <td className="py-5 font-semibold text-slate-800">{getLksSummary(lks)}</td>
                        <td className="py-5 text-slate-600">
                          {lks.desa || "-"}, {lks.kecamatan || "-"}
                          <br />
                          <span className="text-xs text-slate-400">Manggarai Barat</span>
                        </td>
                        <td className="py-5">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {lks.status_lks || getWorkflowStatusLabel(lks.workflow_status)}
                          </span>
                        </td>
                        <td className="max-w-xs py-5 text-slate-600">{lks.alamat || "Alamat belum diisi"}</td>
                        <td className="py-5 text-right">
                          {localLksId === lks.id ? (
                            <div className="flex flex-col items-end gap-2">
                              <button type="button" onClick={() => router.push("/lks/daftar")} className="font-semibold text-blue-700 hover:text-blue-800">
                                Lihat / Ubah
                              </button>
                              <button type="button" onClick={() => void downloadLksFile(lks)} className="font-semibold text-emerald-700 hover:text-emerald-800">
                                Download ZIP LKS
                              </button>
                            </div>
                          ) : <span className="text-xs text-slate-400">Tersimpan di backend</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="text-sm text-slate-500">
                Belum ada data LKS yang dapat diakses dari Supabase.
              </p>

              <Link
                href="/lks/daftar"
                className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Mulai pendataan LKS →
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}