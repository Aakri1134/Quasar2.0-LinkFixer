import type { Request, Response } from "express"
import type { CheckService } from "./check.service.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import { getCheckQuerySchema, listChecksQuerySchema } from "./check.schema.js"
import type { GetCheckParams } from "./check.types.js"

export class CheckController {
  constructor(private readonly service: CheckService) {}

  // Lists the scan history for one website, without any checkedLinks payload.
  listChecks = asyncHandler(async (req: Request, res: Response) => {
    const userID = req.user.id
    // validate() proves the query is well-formed but discards its output, so parsing again here
    // is what turns the raw strings Express hands over into the numbers the service works with.
    const query = listChecksQuerySchema.parse(req.query)
    const result = await this.service.listChecks(userID, query)
    return res.status(200).json(result)
  })

  // Returns one check with a bounded window over its checked links.
  getCheck = asyncHandler(async (req: Request, res: Response) => {
    const userID = req.user.id
    const query = getCheckQuerySchema.parse(req.query)
    const result = await this.service.getCheck(userID, req.params as GetCheckParams, query)
    return res.status(200).json(result)
  })
}
