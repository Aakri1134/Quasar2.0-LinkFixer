import { AlertController } from "./alert.controller.js";
import { AlertRepository } from "./alert.repository.js";
import { AlertService } from "./alert.service.js";

export const alertRepository = new AlertRepository()
export const alertService = new AlertService(alertRepository)
export const alertController = new AlertController(alertService)