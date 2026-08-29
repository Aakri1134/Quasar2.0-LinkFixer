import { AppError } from "../../utils/AppError.js"
import type { UserRepository } from "./user.repository.js"
import type { ChangePasswordInput, PopulatedUserWebsite, UpdateProfileInput, UserProfile } from "./user.types.js"

export class UserService {
	constructor(private readonly repo: UserRepository) {}

	// Returns the websites attached to a user, projected down to the fields the dashboard lists.
	async getWebsites(userId: string) {
		const user = await this.repo.findUserWithWebsites(userId)

		if (!user) {
			throw new AppError("User not found", 404)
		}

		const websites = (user.websites as unknown as PopulatedUserWebsite[] | undefined) ?? []

		return {
			success: true,
			user: userId,
			websites: websites.map(({ domain, updatedAt, id }) => ({ domain, updatedAt, id })),
		}
	}

	// Returns a user's own profile.
	async getProfile(userId: string) {
		const user = await this.repo.findUserByIdWithoutPassword(userId)

		if (!user) {
			throw new AppError("User not found", 404)
		}

		return {
			success: true,
			user: this.formatUser(user),
		}
	}

	// Updates the mutable parts of a user profile.
	async updateProfile(userId: string, input: UpdateProfileInput) {
		const username = input.username.trim()

		if (!username) {
			throw new AppError("Invalid username", 400)
		}

		const user = await this.repo.findUserById(userId)

		if (!user) {
			throw new AppError("User not found", 404)
		}

		user.username = username
		await this.repo.saveUser(user)

		return {
			success: true,
			msg: "Profile updated successfully",
			user: this.formatUser(user),
		}
	}

	// Verifies the current password, replaces it, and revokes every token issued before the change.
	async changePassword(userId: string, input: ChangePasswordInput) {
		const user = await this.repo.findUserById(userId)

		if (!user) {
			throw new AppError("User not found", 404)
		}

		const isMatch = await user.comparePassword(input.currentPassword)
		if (!isMatch) {
			throw new AppError("Current password is incorrect", 400)
		}

		// Assign the plain password - the pre("save") hook on the schema is what hashes it.
		user.password = input.newPassword
		user.tokenVersion = (user.tokenVersion ?? 0) + 1
		await this.repo.saveUser(user)

		return {
			success: true,
			msg: "Password changed successfully. Please log in again.",
		}
	}

	private formatUser(user: { _id: unknown; username: string; email: string; emailVerified: boolean; createdAt: Date }) {
		return {
			id: String(user._id),
			username: user.username,
			email: user.email,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
		} satisfies UserProfile
	}
}
