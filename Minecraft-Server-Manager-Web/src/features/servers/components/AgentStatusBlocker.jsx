"use client";
import { useEffect, useState } from "react";
import { getAgentStatus } from "@/features/auth/services/api";

export function AgentStatusBlocker({ children }) {
  const [agentStatus, setAgentStatus] = useState("ACTIVE");
  const [isLinked, setIsLinked] = useState(true);

  const fetchStatus = () => {
    getAgentStatus()
      .then(res => {
        setIsLinked(res.isLinked);
        if (res.status) setAgentStatus(res.status);
      })
      .catch(() => setIsLinked(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const isInactive = agentStatus === "OFFLINE" || agentStatus === "HIBERNATING" || !isLinked;

  return (
    <div className={`h-full transition-opacity duration-300 ${isInactive ? "opacity-50 pointer-events-none" : ""}`}>
      {children}
    </div>
  );
}
