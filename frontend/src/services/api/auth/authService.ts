import api from "../instance"
import type {
  LogOutUser,
  SignInUser,
  SignUpUser,
  VerifyAuth,
  VerifyMail,
} from "./authService.types"

export class AuthService {
  private static readonly ENDPOINT = "/auth"
  
  static registerUser: SignUpUser = async (data) => {
    const res = await api.post(`${this.ENDPOINT}/register`, data)
    return res.data
  }

  static logInUser: SignInUser = async (data) => {
    const res = await api.post(`${this.ENDPOINT}/login`, data)
    return res.data
  }

  // Revokes the session server-side and clears the cookie. Unauthenticated and idempotent, so it
  // is safe to call even when the cookie is already dead.
  static logOutUser: LogOutUser = async () => {
    const res = await api.post(`${this.ENDPOINT}/logout`)
    return res.data
  }

  static verifyAuthUser: VerifyAuth = async () => {
    const res = await api.get(`${this.ENDPOINT}/verifyAuth`)
    return res.data
  }

  static verifyMail: VerifyMail = async (token: string) => {
    const res = await api.get(`${this.ENDPOINT}/verify-email`, { params: { token } })
    return res.data
  }
}
