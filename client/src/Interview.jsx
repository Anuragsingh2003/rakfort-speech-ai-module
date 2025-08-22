"use client"

import { useState, useRef, useEffect } from "react"

function Interview() {
  const [questions] = useState([
    "Tell me about yourself.",
    "What are your strengths?",
    "Why do you want to work for RakFort Limited?",
  ])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [feedback, setFeedback] = useState("")
  const [time, setTime] = useState(30)
  const [isInterviewComplete, setIsInterviewComplete] = useState(false)
  const mediaRecorderRef = useRef(null)

  useEffect(() => {
    let timer
    if (isRecording && time > 0) {
      timer = setInterval(() => setTime((prev) => prev - 1), 1000)
    } else if (time === 0) {
      setIsRecording(false)
      setIsInterviewComplete(true)
    }
    return () => clearInterval(timer)
  }, [isRecording, time])

  const getSupportedMimeType = () => {
    const types = ["audio/ogg; codecs=opus", "audio/webm; codecs=opus", "audio/webm", "audio/mp4"]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return null
  }

  const startRecording = async () => {
    try {
      const mimeType = getSupportedMimeType()
      if (!mimeType) {
        alert("No supported audio format found for MediaRecorder.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
      const chunks = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data)
      }
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType })
        await sendAudioToBackend(blob, mimeType)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setTime(30) // Reset timer to 30 seconds
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Failed to start recording. Please check microphone permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudioToBackend = async (blob, mimeType) => {
    const formData = new FormData()
    const fileExtension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("webm") ? "webm" : "mp4"
    formData.append("audio", blob, `recording.${fileExtension}`)
    formData.append("question", questions[currentQuestionIndex])

    try {
      const response = await fetch("http://127.0.0.1:5000/evaluate", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      const data = await response.json()
      setTranscript(data.transcript || "No transcript returned")
      setFeedback(data.feedback || "No feedback returned")
      setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))
    } catch (error) {
      console.error("Error sending audio to backend:", error)
      alert("Failed to send audio to backend: " + error.message)
    }
  }

  const endSession = () => {
    setIsInterviewComplete(true)
    if (isRecording) {
      stopRecording()
    }
  }

  // Custom SVG icon components
  const MicOffIcon = () => (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-gray-400"
    >
      <line x1="1" y1="1" x2="23" y2="23"></line>
      <path d="m9 9v3a3 3 0 0 0 5.12 2.12l1.88-1.88"></path>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  )

  const MicIcon = () => (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-green-400"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  )

  const SmallMicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  )

  return (
    <div className="interview-container">
      {/* Header */}
      <div className="header">
        <h1 className="header-title">AI Live Simulation</h1>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Panel - Timer and Mic */}
        <div className="left-panel">
          <div className="timer">{time}</div>

          {/* Microphone Icon */}
          <div className="mic-section">
            {isRecording ? <MicIcon /> : <MicOffIcon />}
            <span className="mic-status">{isRecording ? "Recording..." : "Mic is off"}</span>
          </div>
        </div>

        {/* Right Panel - AI Interviewer */}
        <div className="right-panel">
          <div className="ai-header">AI Interviewer</div>

          <div className="ai-message">
            {isInterviewComplete
              ? "Thank you for answering all my questions. The interview is now complete."
              : questions[currentQuestionIndex]}
          </div>

          {/* Buttons */}
          <div className="button-group">
            {!isInterviewComplete ? (
              <>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`record-button ${isRecording ? "recording" : ""}`}
                >
                  <SmallMicIcon />
                  {isRecording ? "Stop Recording" : "Record Answer"}
                </button>

                <button onClick={endSession} className="end-button">
                  End Session & Get Feedback
                </button>
              </>
            ) : (
              <button onClick={() => window.location.reload()} className="record-button">
                Start New Interview
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      {(transcript || feedback) && (
        <div style={{ padding: "0 24px 24px" }}>
          <div
            style={{
              backgroundColor: "#1a1a1a",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid #333",
            }}
          >
            {transcript && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "12px" }}>
                  Transcript:
                </h3>
                <p style={{ color: "#d1d5db", lineHeight: "1.5" }}>{transcript}</p>
              </div>
            )}
            {feedback && (
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "12px" }}>Feedback:</h3>
                <div style={{ color: "#d1d5db", lineHeight: "1.5" }} dangerouslySetInnerHTML={{ __html: feedback }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Interview
