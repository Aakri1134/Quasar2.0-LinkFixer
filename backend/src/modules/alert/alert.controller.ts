import type { Request, Response } from "express";
import type { AlertService } from "./alert.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listAlertsQuerySchema } from "./alert.schema.js";
import type { DeleteAlertInput } from "./alert.types.js";

export class AlertController {
  constructor(private readonly service: AlertService) {}

  // Lists the alerts raised for one website.
  listAlerts = asyncHandler(async (req: Request, res: Response) => {
    const userID = req.user.id
    // validate() proves the query is well-formed but discards its output, so parsing again here
    // is what turns the raw strings Express hands over into the values the service works with.
    const query = listAlertsQuerySchema.parse(req.query)
    const result = await this.service.listAlerts(userID, query)
    return res.status(200).json(result)
  })

  // Creates an alert.
  createAlert = asyncHandler(async (req: Request, res: Response) => {
    const userID = req.user.id
    const result = await this.service.createAlert(req.body, userID)
    return res.status(201).json(result)
  })

  // Updates an alert by id.
  updateAlert = asyncHandler(async (req: Request, res: Response) => {
    const userID = req.user.id
    const result = await this.service.updateAlert({ ...req.params, ...req.body }, userID)
    return res.status(200).json(result)
  })

  // Deletes an alert by id.
  deleteAlert = asyncHandler(async (req: Request, res: Response) => {
    const userID = req.user.id
    const result = await this.service.deleteAlert(req.params as DeleteAlertInput, userID)
    return res.status(200).json(result)
  })

}
