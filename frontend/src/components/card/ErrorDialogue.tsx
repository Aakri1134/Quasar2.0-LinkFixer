type ErrorDialogueProps = {
  className: string
  message: string
  heading?: string
}

const ErrorDialogue = ({ className, message, heading }: ErrorDialogueProps) => {
  return (
    <div className={` bg-red-500 text-white ${className}`}>
      <h1>{heading}</h1>
      <p>{message}</p>
    </div>
  )
}

export default ErrorDialogue
