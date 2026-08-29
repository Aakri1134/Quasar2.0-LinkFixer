import { CheckController } from "./check.controller.js";
import { CheckRepository } from "./check.repository.js";
import { CheckService } from "./check.service.js";

export const checkRepository = new CheckRepository()
export const checkService = new CheckService(checkRepository)
export const checkController = new CheckController(checkService)
