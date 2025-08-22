"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Interview() {
  const [questions] = useState([
    "Tell me about yourself.",
    "What are your strengths?",
    "Why do you want to work for RakFort Limited?",
  ])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [feedback, setFeedback] = useState("")
  const [timer, setTimer] = useState(30)
  const [isInterviewComplete, setIsInterviewComplete] = useState(true)
  const mediaRecorderRef = useRef(null)

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timer > 0 && !isInterviewComplete) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timer, isInterviewComplete])

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
      const chunks: BlobPart[] = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType })
        await sendAudioToBackend(blob, mimeType)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
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

  const sendAudioToBackend = async (blob: Blob, mimeType: string) => {
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

      if (currentQuestionIndex >= questions.length - 1) {
        setIsInterviewComplete(true)
      } else {
        setCurrentQuestionIndex((prev) => prev + 1)
        setTimer(30) // Reset timer for next question
      }
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-block px-3 py-1 bg-green-500/20 border border-green-500 rounded text-green-400 text-sm font-medium">
          AI Live Simulation
        </div>
      </div>

      <div className="flex gap-6 max-w-6xl mx-auto">
        {/* Left Panel - Timer and Transcript */}
        <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-800 p-8">
          <div className="text-center mb-8">
            <div className="text-8xl font-bold mb-4">{timer}</div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <MicOff className="w-6 h-6" />
              <span>Mic is off</span>
            </div>
          </div>

          <div className="text-gray-400 text-center">
            {transcript ? (
              <div className="text-left">
                <p className="text-white">{transcript}</p>
              </div>
            ) : (
              <p>Your answer will appear here.</p>
            )}
          </div>
        </div>

        {/* Right Panel - AI Interviewer */}
        <div className="w-80 bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">AI Interviewer</h2>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <p className="text-gray-300">Thank you for answering all my questions. The interview is now complete.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Record Answer
            </Button>

            <Button
              onClick={endSession}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg"
            >
              End Session & Get Feedback
            </Button>
          </div>

          {feedback && (
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h3 className="font-medium mb-2">Feedback:</h3>
              <div className="text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: feedback }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
