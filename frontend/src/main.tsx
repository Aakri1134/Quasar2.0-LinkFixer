import "./index.css"
import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import { UserContextProvider } from "./context/userContext.tsx"
import { DashboardContextProvider } from "./context/dashboardContext.tsx"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import AuthCheckWrapper from "./components/wrappers/AuthCheckWrapper.tsx"
import LoadingScreen from "./components/background/LoadingScreen.tsx"
import ErrorBoundary from "./components/wrappers/ErrorBoundary.tsx"
const Home = lazy(() => import("./pages/Home/Home.tsx"))
const Login = lazy(() => import("./pages/Login/Login.tsx"))
const Signup = lazy(() => import("./pages/Signup/Signup.tsx"))
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard.tsx"))
const VerifyMail = lazy(() => import("./pages/VerfiyMail/VerifyMail.tsx"))
const NotFound = lazy(() => import("./pages/NotFound/NotFound.tsx"))
const Account = lazy(() => import("./pages/Account/Account.tsx"))

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/dashboard",
    element: (
      <DashboardContextProvider>
        <AuthCheckWrapper>
          <Dashboard />
        </AuthCheckWrapper>
      </DashboardContextProvider>
    ),
  },
  {
    path: "/account",
    element: (
      <AuthCheckWrapper>
        <Account />
      </AuthCheckWrapper>
    ),
  },
  {
    path: "/verify-email/:token",
    element: <VerifyMail />,
  },
  {
    // Catch-all. Without this an unknown path renders nothing at all.
    path: "*",
    element: <NotFound />,
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserContextProvider>
          <Suspense fallback={<LoadingScreen/>}>
            <RouterProvider router={router} />
          </Suspense>
        </UserContextProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
