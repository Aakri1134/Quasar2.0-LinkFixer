import api from "../instance"
import type {
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

  static verifyAuthUser: VerifyAuth = async () => {
    const res = await api.get(`${this.ENDPOINT}/verifyAuth`)
    return res.data
  }

  static verifyMail: VerifyMail = async (token: string) => {
    const res = await api.get(`${this.ENDPOINT}/verify-email`, { params: { token } })
    return res.data
  }
}
