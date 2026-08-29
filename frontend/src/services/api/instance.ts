import axios from "axios"

// Vite inlines import.meta.env at BUILD time. The fallback keeps `npm run dev` working with no
// .env file; production builds pass VITE_API_URL as a Docker build arg (see frontend/Dockerfile).
// Single-origin deploys use "/api/" so the cookie stays same-site — see REPORT.md section 7.2.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/"

const api = axios.create({
  baseURL,
  withCredentials: true, // CRITICAL: Send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
})

export default api
