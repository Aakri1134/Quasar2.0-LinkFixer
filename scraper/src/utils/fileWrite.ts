import fs from "fs"
import path from "path"
import { config } from "../config/index.js"

export function logWrite(file : string, data : Record<any, any>){
    // if(config.MODE !== "development") return
    const logsPath = path.join(process.cwd(), "logs", file)
    const rawData = fs.readFileSync(logsPath, "utf-8")
    const jsonData = JSON.parse(rawData)
    const time = Date.now()
    jsonData[`${time}_${config.ID}`] = data
    console.log("Writing to  :: " + file)
    fs.writeFileSync(logsPath, JSON.stringify(jsonData), "utf-8")
}