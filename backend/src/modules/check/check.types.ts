import type { Types } from "mongoose"
import type z from "zod"
import type { getCheckQuerySchema, getCheckSchema, listChecksQuerySchema } from "./check.schema.js"
import type { ManagerTasksType, ResultRecords } from "../../workers/managers/Manager.types.js"

export type ListChecksQuery = z.infer<typeof listChecksQuerySchema>

export type GetCheckParams = z.infer<typeof getCheckSchema>["params"]

export type GetCheckQuery = z.infer<typeof getCheckQuerySchema>

// One row of the scan history. `checkedLinks` is deliberately absent: it is an unbounded array of
// every crawled URL, so a list response carries only its length as `linkCount`.
export type CheckSummary = {
  _id: Types.ObjectId
  website: Types.ObjectId | null
  task: ManagerTasksType
  manager?: string
  duration?: number
  aiReport?: string
  createdAt: Date
  updatedAt: Date
  linkCount: number
}

// One check with a bounded window over its checked links. `totalLinks` is the untruncated length,
// so the UI can paginate without ever receiving the whole array.
export type CheckDetail = Omit<CheckSummary, "linkCount"> & {
  totalLinks: number
  checkedLinks: ResultRecords[]
}
