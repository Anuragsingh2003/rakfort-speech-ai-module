// src/Interview.js
import React, { useState, useRef } from 'react';
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
  const mediaRecorderRef = useRef(null);

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
        // Save the audio file for debugging
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recording.webm';
        a.click();
        URL.revokeObjectURL(url);
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

  return (
    <div className="App">
      <h1>Interview Practice</h1>
      <div className="question-container">
        <h2>Question {currentQuestionIndex + 1}</h2>
        <p>{questions[currentQuestionIndex]}</p>
      </div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {transcript && (
        <div className="transcript">
          <h3>Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}
      {feedback && (
        <div className="feedback">
          <h3>Feedback:</h3>
          <div dangerouslySetInnerHTML={{ __html: feedback }} />
        </div>
      )}
    </div>
  );
}

export default Interview;