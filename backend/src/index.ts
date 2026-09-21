import { env } from "./config/env.js"
import { createServer } from "./server.js"

const startServer = async () => {
  const app = await createServer()
  const PORT = env.PORT

  app.listen(PORT, () => {
    if (env.NODE_ENV === "dev")
      console.log(`Server running on http://localhost:${PORT}`)
    else console.log(`Server running on port ${PORT}`)
  })
}

startServer()