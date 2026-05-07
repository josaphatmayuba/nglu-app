import Tabs, { Tab } from "@/UI/Tabs";
import EmailConfig from "./EmailConfig";
import GeneralSetting from "./GeneralSetting";
// import QuickLinkSettings from "./QuickLinkSettings";

export default function AppSettings() {
  return (
    <div>
      <div className=" p-2">
        <h2 className="font-semibold text-lg">App Settings</h2>
        <p>Here you can configure the app settings.</p>
      </div>
      <div>
        <Tabs>
          <Tab label="General">
            <div className="p-4">
              <GeneralSetting />
            </div>
          </Tab>
          {/* <Tab label='Quick Links'>
            <QuickLinkSettings />
          </Tab> */}
          <Tab label="Email Config">
            <EmailConfig />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
