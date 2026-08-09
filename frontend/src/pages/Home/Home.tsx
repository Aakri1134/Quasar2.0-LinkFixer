import Header from "../../components/header/Header"
import { FeaturesSection } from "./sections/CardSection"
import { FEATURES, STEPS } from "./Home.utils"
import { HomeSection } from "./sections/HeroSection"
import TriColorMouseTrail from "@/components/background/MouseTrail"
import { StepsSection } from "./sections/StepSection"

const Home = () => {
  return (
    <TriColorMouseTrail>
      <Header />
      <HomeSection />
      <FeaturesSection
        heading="Everything you need"
        subheading="A complete toolkit for keeping your website healthy and your users happy."
        items={FEATURES}
      />
      <StepsSection items={STEPS}/>
    </TriColorMouseTrail>
  )
}

export default Home
