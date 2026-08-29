import { env } from "../../config/env.js"
import { AppError } from "../../utils/AppError.js"
import type { CheckRepository } from "./check.repository.js"
import type { GetCheckParams, GetCheckQuery, ListChecksQuery } from "./check.types.js"

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

// env.LINK_RESULT_PAGE_SIZE only sets the *default* window over Check.checkedLinks. This is the
// ceiling, applied server-side, so a client asking for ?linkLimit=100000 still gets 500 records
// instead of the whole unbounded array.
const MAX_LINK_PAGE_SIZE = 500

export class CheckService {
  constructor(private readonly repo: CheckRepository) {}

  // Lists one website's scan history, newest-first and without any checkedLinks payload.
  async listChecks(userId: string, query: ListChecksQuery) {
    await this.assertWebsiteAccess(userId, query.websiteID)

    const page = this.resolvePage(query.page)
    const limit = this.resolveLimit(query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    const [checks, total] = await Promise.all([
      this.repo.findChecksForWebsite(query.websiteID, (page - 1) * limit, limit),
      this.repo.countChecksForWebsite(query.websiteID),
    ])

    return {
      success: true,
      checks,
      total,
      page,
      limit,
    }
  }

  // Returns one check plus a bounded page of its checked links.
  async getCheck(userId: string, params: GetCheckParams, query: GetCheckQuery) {
    // Authorize before reading anything large: this pulls the website reference and nothing else.
    const reference = await this.repo.findCheckWebsite(params.checkID)
    if (!reference?.website) {
      throw new AppError("Check not found", 404)
    }

    await this.assertWebsiteAccess(userId, String(reference.website), "Check not found")

    const linkPage = this.resolvePage(query.linkPage)
    const linkLimit = this.resolveLimit(query.linkLimit, env.LINK_RESULT_PAGE_SIZE, MAX_LINK_PAGE_SIZE)

    const [record] = await this.repo.findCheckWithLinkSlice(
      params.checkID,
      (linkPage - 1) * linkLimit,
      linkLimit,
    )

    if (!record) {
      throw new AppError("Check not found", 404)
    }

    const { checkedLinks, totalLinks, ...check } = record

    return {
      success: true,
      check,
      checkedLinks,
      totalLinks,
      linkPage,
      linkLimit,
    }
  }

  // Throws 404 unless the user is attached to the website. 404 rather than 403 on purpose:
  // a 403 confirms the record exists and so leaks its existence to anyone guessing ids.
  private async assertWebsiteAccess(userId: string, websiteID: string, message = "Website not found") {
    const website = await this.repo.findWebsiteForUser(websiteID, userId)

    if (!website) {
      throw new AppError(message, 404)
    }
  }

  // Normalises a requested page number to a whole number of at least 1.
  private resolvePage(requested: number | undefined) {
    return requested !== undefined && Number.isInteger(requested) && requested > 0 ? requested : 1
  }

  // Clamps a requested page size into [1, max], falling back when it is absent or unusable.
  private resolveLimit(requested: number | undefined, fallback: number, max: number) {
    const candidate =
      requested !== undefined && Number.isInteger(requested) && requested > 0 ? requested : fallback
    const safe = Number.isInteger(candidate) && candidate > 0 ? candidate : 1

    return Math.min(safe, max)
  }
}
