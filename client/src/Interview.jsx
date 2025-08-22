// src/Interview.jsx
import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function Interview() {
  const [questions] = useState([
    "Tell me about yourself.",
    "What are your strengths?",
    "Why do you want to work for RakFort Limited?"
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [time, setTime] = useState(0);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => setTime((prev) => prev + 1), 1000);
    } else {
      clearInterval(timer);
      if (time > 0) setTime(0); // Reset timer when stopping
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const getSupportedMimeType = () => {
    const types = [
      'audio/ogg; codecs=opus',
      'audio/webm; codecs=opus',
      'audio/webm',
      'audio/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`Supported MIME type: ${type}`);
        return type;
      }
    }
    console.error('No supported audio format found for MediaRecorder.');
    return null;
  };

  const startRecording = async () => {
    try {
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        alert('No supported audio format found for MediaRecorder.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        console.log('Data available:', e.data);
        chunks.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        console.log('MediaRecorder stopped');
        const blob = new Blob(chunks, { type: mimeType });
        console.log('Audio blob created:', blob);
        await sendAudioToBackend(blob, mimeType);
      };
      mediaRecorderRef.current.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        alert('Recording error occurred.');
      };

      mediaRecorderRef.current.start();
      console.log('Recording started with MIME type:', mimeType);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping MediaRecorder, current state:', mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      console.error('MediaRecorder is not active or not initialized');
      alert('Cannot stop recording: No active recording found.');
    }
  };

  const sendAudioToBackend = async (blob, mimeType) => {
    const formData = new FormData();
    const fileExtension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('webm') ? 'webm' : 'mp4';
    formData.append('audio', blob, `recording.${fileExtension}`);
    formData.append('question', questions[currentQuestionIndex]);

    try {
      console.log('Sending audio to backend:', blob);
      const response = await fetch('http://127.0.0.1:5000/evaluate', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Backend response:', data);
      setTranscript(data.transcript || 'No transcript returned');
      setFeedback(data.feedback || 'No feedback returned');
      setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
    } catch (error) {
      console.error('Error sending audio to backend:', error);
      alert('Failed to send audio to backend: ' + error.message);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleQuestionChange = (index) => {
    setCurrentQuestionIndex(index);
    setTranscript('');
    setFeedback('');
  };

  return (
    <div className="interview-container">
      <h1 className="interview-title">Interview Practice</h1>
      <div className="question-section">
        <h2 className="question-header">Question {currentQuestionIndex + 1} of {questions.length}</h2>
        <select
          className="question-select"
          value={currentQuestionIndex}
          onChange={(e) => handleQuestionChange(parseInt(e.target.value))}
        >
          {questions.map((q, index) => (
            <option key={index} value={index}>
              {q}
            </option>
          ))}
        </select>
        <p className="current-question">{questions[currentQuestionIndex]}</p>
      </div>
      <div className="recording-section">
        <div className="timer">Recording Time: {formatTime(time)}</div>
        <button
          className={`record-button ${isRecording ? 'stop' : 'start'}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      {transcript && (
        <div className="transcript-section">
          <h3 className="section-header">Transcript:</h3>
          <p className="transcript-text">{transcript}</p>
        </div>
      )}
      {feedback && (
        <div className="feedback-section">
          <h3 className="section-header">Feedback:</h3>
          <div className="feedback-text" dangerouslySetInnerHTML={{ __html: feedback }} />
        </div>
      )}
    </div>
  );
}

export default Interview;