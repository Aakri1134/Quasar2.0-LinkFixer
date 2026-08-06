import { User } from "../../models/user.js"
import { Website } from "../../models/website.js"

export class WebsiteRepository {
  // Loads a user document by id.
  findUserById(userId: string) {
    return User.findById(userId)
  }

  // Loads a user document without the password field.
  findUserByIdWithoutPassword(userId: string) {
    return User.findById(userId).select("-password")
  }

  // Loads a website by id.
  findWebsiteById(websiteId: string) {
    return Website.findById(websiteId)
  }

  // Loads a website by domain.
  findWebsiteByDomain(domain: string) {
    return Website.findOne({ domain })
  }

  // Creates a website document.
  createWebsite(data: Record<string, unknown>) {
    return new Website(data)
  }

  // Persists a user document.
  saveUser(user: any) {
    return user.save()
  }

  // Persists a website document.
  saveWebsite(website: any) {
    return website.save()
  }
}
