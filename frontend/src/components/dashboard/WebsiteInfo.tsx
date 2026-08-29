import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import Alert from "./WebsiteInfo/Alerts"
import Overview from "./WebsiteInfo/Overview"
import Setting from "./WebsiteInfo/Settings"
import History from "./WebsiteInfo/History"

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Alerts", value: "alerts" },
  { label: "History", value: "history" },
  { label: "Settings", value: "settings" },
]

export default function WebsiteInfo() {
  return (
    <section
      className="w-screen items-center justify-center flex flex-1"
      style={{
        backgroundImage: "radial-gradient(circle, #e0e7ff 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="min-w-6xl bg-white h-full">
        <Tabs defaultValue="overview">
          <div className=" w-full border-b">
            <TabsList className="bg-transparent border-gray-200 rounded-none h-auto p-0 justify-start">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none w-50 px-4 py-3 text-sm font-medium text-gray-500 border-0 hover:text-gray-800 border-b-2 border-transparent data-active:border-green-800 data-active:text-green-800 data-active:shadow-none data-active:bg-transparent bg-transparent shadow-none"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="overview" className="p-4"><Overview /></TabsContent>
          <TabsContent value="alerts" className="p-4"><Alert /></TabsContent>
          <TabsContent value="history" className="p-4"><History /></TabsContent>
          <TabsContent value="settings" className="p-4"><Setting /></TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
