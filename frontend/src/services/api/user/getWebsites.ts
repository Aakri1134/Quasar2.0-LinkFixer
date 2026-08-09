import api from "../instance"

const getWebsites = async () => {
  try {
    const { data: res } = await api.get("/user/websites")
    if (res.success) {
        return res.website
    }
  } catch (err) {
    console.log(err)
    return null
  }
}

export default getWebsites
