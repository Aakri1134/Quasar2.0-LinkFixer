import { useEffect } from "react"
import { createPortal } from "react-dom"

interface Input {
  children: React.ReactNode
  hideModal: () => void
  style?: React.CSSProperties
}

const ModalPortal = ({ children, hideModal, style={} }: Input) => {
  useEffect(() => {
    const scrollY = window.scrollY
    const overflow = document.body.style.overflow

    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"

    return () => {
      document.body.style.overflow = overflow
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      window.scrollTo(0, scrollY)
    }
  }, [])
  return createPortal(
    <div
      style={{
        inset: 0,
        position: "fixed",
        ...style
      }}
      onClick={hideModal}
    >
        <div onClick={(e) => {e.stopPropagation()}}>
      {children}
      </div>
    </div>,
    document.body
  )
}

export default ModalPortal
