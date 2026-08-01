"use client";
import { ShieldAlert } from "lucide-react";
import { useServers } from "@/features/servers/hooks/useServers";
import { useTranslations } from "next-intl";

export function GlobalBackupsSummary() {
  const t = useTranslations("Profile");
  const { servers } = useServers();
  const activeCount = (servers || []).filter(s => s.status !== "OFFLINE").length;

  return (
    <div className="bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-secondary" />
        <h2 className="text-xl font-bold">{t("securityStatusTitle")}</h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-surface-border rounded-blocky">
        {servers.length > 0 ? (
          <>
            <p className="text-foreground/70 font-semibold mb-2">
              {t("allServersBackedUp", { count: servers.length })}
            </p>
            <span className="text-sm text-foreground/50">
              {t("serversCountSummary", { active: activeCount })}
            </span>
          </>
        ) : (
          <p className="text-foreground/70 font-semibold">
            {t("noServersRegistered")}
          </p>
        )}
      </div>
    </div>
  );
}
