import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:5000/api/",
  withCredentials: true, // CRITICAL: Send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
})

export default api
