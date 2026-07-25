import { DashboardNavbar } from "@/features/dashboard/components/DashboardNavbar";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { AgentStatusBlocker } from "@/features/servers/components/AgentStatusBlocker";

export default function ServerDashboardLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNavbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <AgentStatusBlocker>
            {children}
          </AgentStatusBlocker>
        </main>
      </div>
    </div>
  );
}
