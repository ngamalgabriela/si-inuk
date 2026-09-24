"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/";
  const loginError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const displayedMessage = loginError === "admin_only"
    ? "Akun ini tidak memiliki akses admin SI-INUK."
    : message;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message.toLowerCase().includes("invalid login credentials")
        ? "Email atau kata sandi salah."
        : "Login gagal. Periksa konfigurasi akun dan coba lagi.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace(redirectedFrom.startsWith("/") ? redirectedFrom : "/");
    router.refresh();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06152e] px-4 py-3 sm:py-5">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#06152e_0%,#0a2a58_52%,#06284d_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(125,211,252,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.12)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-[0_24px_80px_rgba(2,12,35,0.42)]">
        <div className="bg-[#171923] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100/60 bg-cyan-50 text-lg font-black text-blue-900 shadow-[0_0_24px_rgba(103,232,249,0.3)]">S</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-100">Si-INUK</p>
              <p className="mt-1 text-xs text-blue-100">Sistem Informasi Integrasi Navigasi Unit Kesejahteraan Sosial</p>
            </div>
          </div>

          <div className="si-inuk-scene" role="img" aria-label="Animasi karakter membuka tas berisi data SI-INUK">
            <div className="si-inuk-spark si-inuk-spark-one" />
            <div className="si-inuk-spark si-inuk-spark-two" />
            <div className="si-inuk-character">
              <div className="si-inuk-head" />
              <div className="si-inuk-body" />
              <div className="si-inuk-arm si-inuk-arm-left" />
              <div className="si-inuk-arm si-inuk-arm-right" />
            </div>
            <div className="si-inuk-bag">
              <div className="si-inuk-bag-lid" />
              <div className="si-inuk-bag-body" />
              <div className="si-inuk-data-card si-inuk-data-card-one">LKS</div>
              <div className="si-inuk-data-card si-inuk-data-card-two">PSKS</div>
              <div className="si-inuk-data-card si-inuk-data-card-three">TDD</div>
            </div>
            <span className="si-inuk-scene-label">DATA SI-INUK</span>
          </div>

          <div className="mt-3 rounded-xl bg-[linear-gradient(135deg,#5366f5_0%,#4162df_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <p className="text-xs leading-5 text-blue-50">Media Pengelolaan, Pemutahiran, dan Penyajian Data PSKS Pada Dinas Sosial P3A Kabupaten Manggarai Barat.</p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Akses aman • Portal PSKS</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">Selamat Datang</h1>
            <p className="mt-2 text-sm leading-5 text-slate-500">Masuk untuk melanjutkan pengelolaan data SI-INUK.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <label className="block text-sm font-medium text-slate-700">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="nama@contoh.com" autoComplete="email" required />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span>Kata Sandi</span>
              <div className="relative mt-1.5">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Masukkan kata sandi" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? "Sembunyikan" : "Lihat"}</button>
              </div>
            </label>

            <div className="flex items-center justify-end gap-4 text-sm">
              <button type="button" onClick={() => setMessage("Reset kata sandi belum dikonfigurasi untuk project ini.")} className="font-semibold text-blue-700 hover:text-blue-900">Lupa Kata Sandi?</button>
            </div>

            {displayedMessage ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">{displayedMessage}</div> : null}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Memverifikasi akses...</> : "Masuk"}
            </button>
          </form>

          <div className="my-3.5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>Atau masuk dengan</span><span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={() => setMessage("Login Google belum dikonfigurasi untuk project ini.")} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-bold text-blue-600">G</span>Masuk dengan Google</button>

          <p className="mt-4 text-center text-sm text-slate-500">Kembali ke <Link href="/" className="font-semibold text-blue-700 hover:text-blue-900">dashboard</Link></p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">Memuat halaman masuk...</div>}>
      <LoginContent />
    </Suspense>
  );
}
