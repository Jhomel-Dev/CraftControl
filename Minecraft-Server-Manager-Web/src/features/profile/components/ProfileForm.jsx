"use client";
import { useState, useEffect } from "react";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { User, Save } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useToast } from "@/shared/ui/ToastProvider";
import { useTranslations } from "next-intl";

export function ProfileForm() {
  const t = useTranslations("Profile");
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState(user?.username || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || user.name || "");
    setEmail(user.email || "");
  }, [user]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    setUser({ ...(user || {}), username: username.trim(), email: email.trim() });
    toast(t("updatedToast"), "success");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-primary/20 rounded-blocky flex items-center justify-center text-primary border-2 border-primary">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{t("personalInfoTitle")}</h2>
          <p className="text-foreground/60 text-sm">{t("personalInfoSubtitle")}</p>
        </div>
      </div>

      <div>
        <label className="font-bold block mb-2">{t("usernameLabel")}</label>
        <Input 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label className="font-bold block mb-2">{t("emailLabel")}</label>
        <Input 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button type="submit">
          <Save className="w-4 h-4 mr-2 inline-block" /> {t("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
