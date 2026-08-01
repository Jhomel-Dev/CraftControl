"use client";
import { use, useState, useEffect } from "react";
import { Globe, Link as LinkIcon, ExternalLink, ShieldCheck, Activity } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/shared/ui/ToastProvider";
import { getMyServers, updateSettings } from "@/features/servers/services/serverApi";
import { useTranslations } from "next-intl";

export default function NetworkPage({ params }) {
  const t = useTranslations("ServerNetwork");
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const { toast } = useToast();
  
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState("");
  const [tunnelSecret, setTunnelSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchServer = async () => {
    try {
      setLoading(true);
      const servers = await getMyServers();
      const found = servers.find(s => s.id === serverId);
      if (found) {
        setServer(found);
        setSubdomain(found.customDomain || "");
        setTunnelSecret(found.tunnelSecret || "");
      }
    } catch (error) {
      console.error("Error loading server:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServer();
    const interval = setInterval(fetchServer, 10000);
    return () => clearInterval(interval);
  }, [serverId]);

  const handleSaveDomain = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      
      const payload = {};
      if (subdomain !== undefined) payload.customDomain = subdomain;
      if (tunnelSecret !== undefined) payload.tunnelSecret = tunnelSecret;

      await updateSettings(serverId, payload);
      await fetchServer();
      
      setSuccess(true);
      toast(t("networkUpdatedToast"), "success");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      toast(t("networkErrorToast") + (err.message || ""), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !server) return <div className="p-8 text-center animate-pulse">{t("loadingText")}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-blocky border-2 border-primary/20">
            <Globe className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{t("title")}</h1>
            <p className="text-foreground/70 font-semibold">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border-2 border-surface-border rounded-blocky p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">{t("directIpTitle")}</h2>
          </div>
          <p className="text-foreground/70 mb-4 text-sm font-semibold">
            {t("directIpDesc")}
          </p>
          
          <div className="bg-warning/10 border-2 border-warning/20 rounded-blocky p-3 mb-4 flex items-start gap-2 text-warning">
            <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              {t("warningText")}
            </p>
          </div>
          
          <div className="bg-background border-2 border-surface-border rounded-blocky p-4 flex items-center justify-between">
            <code className="text-lg text-primary font-bold">
              {server?.tunnelIp ? (
                server.tunnelIp
              ) : server?.status !== "OFFLINE" ? (
                t("assigningIp")
              ) : (
                <span className="opacity-50">{t("poweredOff")}</span>
              )}
            </code>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-surface-border hover:bg-surface-border"
              disabled={!server?.tunnelIp}
              onClick={() => navigator.clipboard.writeText(server?.tunnelIp || "")}
            >
              {t("copyAddress")}
            </Button>
          </div>
        </div>

        <div className="bg-surface border-2 border-surface-border rounded-blocky p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold">{t("customDomainTitle")}</h2>
          </div>
          <p className="text-foreground/70 mb-4 text-sm font-semibold">
            {t("customDomainDesc")}
          </p>
          
          <div className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder={t("subdomainExample")} 
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              className="w-full bg-background border-2 border-surface-border rounded-blocky px-4 py-3 font-bold focus:outline-none focus:border-primary transition-colors"
            />
            
            <p className="text-foreground/70 text-sm font-semibold mt-2">
              {t("secretOptionalLabel")}
            </p>
            <input 
              type="password" 
              placeholder={t("secretPlaceholder")} 
              value={tunnelSecret}
              onChange={(e) => setTunnelSecret(e.target.value)}
              className="w-full bg-background border-2 border-surface-border rounded-blocky px-4 py-3 font-bold focus:outline-none focus:border-primary transition-colors"
            />
            {success && (
              <div className="bg-green-500/10 text-green-500 border-2 border-green-500/20 p-3 rounded-blocky text-sm font-bold flex items-center justify-center animate-in fade-in zoom-in duration-300">
                {t("domainSuccessAlert")}
              </div>
            )}
            <Button 
              className="w-full font-bold" 
              onClick={handleSaveDomain} 
              disabled={saving}
            >
              {saving ? t("saving") : t("saveNetworkBtn")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
