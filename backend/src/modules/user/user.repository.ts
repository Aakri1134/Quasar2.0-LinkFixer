import { User } from "../../models/user.js"

export class UserRepository {
	// Finds a user by id.
	findUserById(userId: string) {
		return User.findById(userId)
	}

	// Finds a user by id without the password field.
	findUserByIdWithoutPassword(userId: string) {
		return User.findById(userId).select("-password")
	}

	// Finds a user by id with their websites populated.
	findUserWithWebsites(userId: string) {
		return User.findById(userId).select("-password").populate("websites")
	}

	// Persists a user document.
	saveUser(user: InstanceType<typeof User>) {
		return user.save()
	}
}
