import DashboardHeader from "../../components/dashboard/DashboardHeader"
import DashboardSubheader from "../../components/dashboard/DashboardSubheader"
import SiteList from "../../components/dashboard/SiteList"
import WebsiteInfo from "@/components/dashboard/WebsiteInfo"
import { useDashboardContext } from "@/context/dashboardContext"

function Dashboard() {
  const dashboardContext = useDashboardContext()
  return (
    <div className=" h-screen w-screen flex flex-col">
      <DashboardHeader />

      {dashboardContext.currentWebsite ? (
        <WebsiteInfo/>
      ) : (
        <>
          <DashboardSubheader
            data={[
              {
                heading: "Total websites",
                data: dashboardContext?.websites?.length ?? 0,
              },
            ]}
          />
          <SiteList/>
        </>
      )}
    </div>
  )
}

export default Dashboard
