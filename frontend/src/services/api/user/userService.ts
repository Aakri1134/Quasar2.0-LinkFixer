import api from "../instance"
import type {
  changePasswordOutput,
  changePasswordPayload,
  getMeOutput,
  updateProfileOutput,
  updateProfilePayload,
} from "./userService.types"

export class UserService {
  private static ENDPOINT = "/user"

  // The authenticated user's own profile.
  static async getMe(): Promise<getMeOutput> {
    return (await api.get(`${UserService.ENDPOINT}/me`)).data
  }

  // Updates the mutable parts of the profile. Username only, today.
  static async updateMe(payload : updateProfilePayload): Promise<updateProfileOutput> {
    return (await api.patch(`${UserService.ENDPOINT}/me`, payload)).data
  }

  // Changes the password. This bumps the user's tokenVersion server-side, which REVOKES the
  // caller's own session and clears the cookie — every later request 401s until they log in
  // again. Callers must send the user to /login on success; see useChangePassword.
  static async changePassword(payload : changePasswordPayload): Promise<changePasswordOutput> {
    return (await api.post(`${UserService.ENDPOINT}/password`, payload)).data
  }
}
