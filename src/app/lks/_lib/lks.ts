export const LKS_STATUS_OPTIONS = [
  "Aktif",
  "Tidak Aktif",
  "Menunggu Verifikasi",
  "Ditolak",
] as const;

export type LksStatus = (typeof LKS_STATUS_OPTIONS)[number] | string;

export type LksWorkflowStatus =
  | "draft"
  | "menunggu_verifikasi"
  | "disetujui"
  | "ditolak"
  | "tidak_aktif";

export type LksRecord = {
  id?: string;
  nama_lks?: string;
  kecamatan?: string;
  desa?: string;
  alamat?: string;
  status_lks?: string;
  latitude?: string;
  longitude?: string;
  workflow_status?: LksWorkflowStatus;
  updated_at?: string;
};

export const LKS_WORKFLOW_STATUS_LABELS: Record<LksWorkflowStatus, string> = {
  draft: "Draft",
  menunggu_verifikasi: "Menunggu Verifikasi",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  tidak_aktif: "Tidak Aktif",
};

export function normalizeWorkflowStatus(value?: string | null): LksWorkflowStatus {
  switch ((value || "").trim().toLowerCase()) {
    case "menunggu verifikasi":
    case "menunggu_verifikasi":
      return "menunggu_verifikasi";
    case "disetujui":
      return "disetujui";
    case "ditolak":
      return "ditolak";
    case "tidak aktif":
    case "tidak_aktif":
      return "tidak_aktif";
    case "draft":
    default:
      return "draft";
  }
}

export function getWorkflowStatusLabel(value?: string | null): string {
  return LKS_WORKFLOW_STATUS_LABELS[normalizeWorkflowStatus(value)];
}

export function getLksCompletionScore(data?: Partial<LksRecord> | null): number {
  if (!data) return 0;

  const checks = [
    data.nama_lks,
    data.kecamatan,
    data.desa,
    data.alamat,
    data.status_lks,
    data.latitude,
    data.longitude,
  ];

  const complete = checks.filter((value) => typeof value === "string" && value.trim().length > 0).length;
  return Math.min(100, Math.round((complete / checks.length) * 100));
}

export function getLksSummary(data?: Partial<LksRecord> | null): string {
  if (!data) return "Belum ada data LKS";

  if (data.nama_lks) {
    return data.nama_lks.trim();
  }

  if (data.kecamatan || data.desa) {
    return [data.desa, data.kecamatan].filter(Boolean).join(" - ");
  }

  return "LKS belum tercatat";
}
