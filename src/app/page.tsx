import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiInukDashboard from "./_components/si-inuk-dashboard";
import LksDashboard from "./_components/lks-dashboard";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "lks") {
    return <LksDashboard />;
  }

  return <SiInukDashboard />;
}