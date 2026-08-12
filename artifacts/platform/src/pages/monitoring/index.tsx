import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Clock, ChevronRight } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface ActiveTest {
  id: string;
  title: string;
  subject: string;
  quarter: number;
  duration_minutes: number;
  is_anonymous: boolean;
}

export default function MonitoringPage() {
  const { data: tests = [], isLoading } = useQuery<ActiveTest[]>({
    queryKey: ["monitoring-active"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/active`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<ActiveTest[]>;
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chorak Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Har chorakda, har fandan bir marta o'tkaziladigan nazorat testi
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Yuklanmoqda...</div>
      ) : tests.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-8 text-center">
          <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">Hozircha sizga tegishli faol test yo'q</p>
          <p className="text-muted-foreground text-sm mt-1">
            Chorak monitoring testi ochilganda shu yerda ko'rinadi
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tests.map((t) => (
            <Link key={t.id} href={`/monitoring/${t.id}`}>
              <div className="group rounded-2xl border p-5 hover:shadow-lg transition-all cursor-pointer bg-card hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      {t.quarter}-chorak
                    </span>
                    <h3 className="font-bold text-lg mt-2">{t.subject}</h3>
                    <p className="text-muted-foreground text-sm">{t.title}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {t.duration_minutes} daqiqa
                  {t.is_anonymous && (
                    <span className="ml-2 bg-muted rounded-full px-2 py-0.5">Anonim</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
