import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import "./index.css"
import Home from "./pages/Home/Home.tsx"
import Login from "./pages/Login/Login.tsx"
import Dashboard from "./pages/Dashboard/Dashboard.tsx"
import { UserContextProvider } from "./context/userContext.tsx"
import { DashboardContextProvider } from "./context/dashboardContext.tsx"
import Signup from "./pages/Signup/Signup.tsx"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { VerifyMail } from "./pages/VerfiyMail/VerifyMail.tsx"

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <UserContextProvider>
        <Home />
      </UserContextProvider>
    ),
  },
  {
    path: "/login",
    element: (
      <UserContextProvider>
        <Login />
      </UserContextProvider>
    ),
  },
  {
    path: "/signup",
    element: (
      <UserContextProvider>
        <Signup />
      </UserContextProvider>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <UserContextProvider>
        <DashboardContextProvider>
          <Dashboard />
        </DashboardContextProvider>
      </UserContextProvider>
    ),
  },
  {
    path: "/verify-email/:token",
    element: (
      <UserContextProvider>
        <VerifyMail/>
      </UserContextProvider>
    )
  }
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
