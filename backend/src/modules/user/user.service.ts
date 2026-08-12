import type { UserRepository } from "./user.repository.js"

export class UserService {
	constructor(private readonly repo: UserRepository) {}
}
