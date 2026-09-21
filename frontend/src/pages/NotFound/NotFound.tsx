import { Link } from "react-router"

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <p className="font-mono text-6xl font-semibold tracking-tight text-gray-900">404</p>
      <h1 className="text-xl font-semibold text-gray-900">This page doesn't exist</h1>
      <p className="max-w-md text-sm text-gray-500">
        The link may be broken or the page may have moved — the sort of thing LinkFixer is for.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-400"
      >
        Back to home
      </Link>
    </div>
  )
}
