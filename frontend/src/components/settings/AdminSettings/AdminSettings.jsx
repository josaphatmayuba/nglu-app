import Tabs, { Tab } from "@/UI/Tabs";
import AdminUsers from "./tabs/AdminUsers";
import AdminModels from "./tabs/AdminModels";
import AdminAudit from "./tabs/AdminAudit";
import AdminBackup from "./tabs/AdminBackup";

export default function AdminSettings() {
  return (
    <div>
      <div className="p-2">
        <h2 className="font-semibold text-lg">Admin Settings</h2>
        <p>Manage users, models, audit logs, and system backups.</p>
      </div>
      <div>
        <Tabs>
          <Tab label="Users">
            <div className="p-4">
              <AdminUsers />
            </div>
          </Tab>
          <Tab label="Models">
            <div className="p-4">
              <AdminModels />
            </div>
          </Tab>
          <Tab label="Audit">
            <div className="p-4">
              <AdminAudit />
            </div>
          </Tab>
          <Tab label="Backup">
            <div className="p-4">
              <AdminBackup />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
