import { useState } from 'react'
import { clipInfo } from './clips'
import { interpretRequest } from './requests'
import { chooseClip, chooseFigure, chooseSide, seek, useStudio } from './store'

export default function RequestField() {
  const [text, setText] = useState(''),
    [feedback, show] = useState('')
  function apply() {
    try {
      const request = interpretRequest(text, useStudio.getState().clip)
      chooseClip(request.clip)
      if (request.figure) chooseFigure(request.figure)
      if (request.side && clipInfo(request.clip).unilateral) chooseSide(request.side)
      if (request.angle) useStudio.setState({ angle: request.angle })
      seek(0)
      show(clipInfo(request.clip).name + ' selected.')
    } catch (e) {
      show(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <form
      className="studio-request"
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
    >
      <label>
        Describe a movement
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Show a push-up, skeleton and human"
        />
      </label>
      <button disabled={!text.trim()}>Set up movement</button>
      {feedback && <p role="status">{feedback}</p>}
    </form>
  )
}
