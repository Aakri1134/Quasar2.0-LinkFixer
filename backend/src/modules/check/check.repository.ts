import { Types } from "mongoose"
import { Checks } from "../../models/check.js"
import { Website } from "../../models/website.js"
import type { CheckDetail, CheckSummary } from "./check.types.js"

// The only fields a check response ever carries by default. `checkedLinks` is never one of them:
// it holds one record per crawled URL (status, analytics, and since 2026-08-25 metadata + schema
// payloads too), so echoing it back per row would ship megabytes for a single page of history.
// Anything that needs the links asks for a $slice window instead.
const CHECK_SUMMARY_PROJECTION = {
  website: 1,
  task: 1,
  manager: 1,
  duration: 1,
  aiReport: 1,
  createdAt: 1,
  updatedAt: 1,
}

export class CheckRepository {
  // Loads a website by id only if the requesting user is attached to it.
  findWebsiteForUser(websiteID: string, userId: string) {
    return Website.findOne({ _id: websiteID, userID: userId }).select("_id").lean()
  }

  // Loads only a check's website reference — enough to authorize a read, cheap enough to do first.
  findCheckWebsite(checkID: string) {
    return Checks.findById(checkID).select("website").lean()
  }

  // Lists one website's scan history newest-first, with checkedLinks reduced to its length.
  findChecksForWebsite(websiteID: string, skip: number, limit: number) {
    return Checks.aggregate<CheckSummary>([
      { $match: { website: new Types.ObjectId(websiteID) } },
      // Sorting on createdAt alone keeps this on the { website: 1, createdAt: -1 } index in
      // models/check.ts; adding a tiebreaker would force a blocking in-memory sort instead.
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          ...CHECK_SUMMARY_PROJECTION,
          linkCount: { $size: { $ifNull: ["$checkedLinks", []] } },
        },
      },
    ])
  }

  // Counts one website's checks, for the pagination total.
  countChecksForWebsite(websiteID: string) {
    return Checks.countDocuments({ website: websiteID })
  }

  // Loads one check with a $slice window over checkedLinks plus the untruncated array length.
  findCheckWithLinkSlice(checkID: string, skip: number, limit: number) {
    return Checks.aggregate<CheckDetail>([
      { $match: { _id: new Types.ObjectId(checkID) } },
      {
        $project: {
          ...CHECK_SUMMARY_PROJECTION,
          totalLinks: { $size: { $ifNull: ["$checkedLinks", []] } },
          // $ifNull guards checks written before checkedLinks had a default.
          checkedLinks: { $slice: [{ $ifNull: ["$checkedLinks", []] }, skip, limit] },
        },
      },
    ])
  }
}
