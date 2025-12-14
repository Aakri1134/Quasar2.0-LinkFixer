import DashboardHeader from "../../components/dashboard/DashboardHeader"
import DashboardSubheader from "../../components/dashboard/DashboardSubheader"
import SiteList from "../../components/dashboard/SiteList"

function Dashboard() {

  

  return (
    <div className=" h-screen w-screen flex flex-col">
      <DashboardHeader/>
      <DashboardSubheader/>
      <SiteList/>
    </div>
  )
}

export default Dashboard
