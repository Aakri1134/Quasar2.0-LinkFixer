import fs from "fs"
import path from "path"
import { config } from "../config/index.js"

export function logWrite(file : string, data : Record<any, any>){
    // if(config.MODE !== "development") return
    const logsDir = path.join(process.cwd(), "logs")
    const logsPath = path.join(logsDir, file)

    // readFileSync threw on a missing directory or first-ever write, which took the whole
    // scraper down from what is only a diagnostics path. Treat "not there yet" as an empty log.
    let jsonData: Record<string, unknown> = {}
    try {
        jsonData = JSON.parse(fs.readFileSync(logsPath, "utf-8"))
    } catch {
        jsonData = {}
    }

    const time = Date.now()
    jsonData[`${time}_${config.ID}`] = data
    console.log("Writing to  :: " + file)
    try {
        fs.mkdirSync(logsDir, { recursive: true })
        fs.writeFileSync(logsPath, JSON.stringify(jsonData), "utf-8")
    } catch (err) {
        console.error(`[${config.ID}] :: Failed to write log ${file} :: `, (err as Error).message)
    }
}
