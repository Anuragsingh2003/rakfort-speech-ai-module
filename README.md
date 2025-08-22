RakFort Interview System
Overview
   A web-based interview practice system with audio transcription, feedback generation, and a user dashboard with CV parsing and job recommendations.
Setup Instructions

Install Dependencies:
Node.js (for React front-end)
Python 3.8+ (for Flask back-end)
Google Cloud SDK
Gemini API key from aistudio.google.com
Install packages:cd rakfort-interview-system
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install flask flask-cors google-cloud-speech google-generativeai pdfplumber


Add your Gemini API key to app.py.


Front-End Setup:cd client
npm install
npm start


Run the Application:
Start Flask: python app.py (runs at http://127.0.0.1:5000).
Start React: npm start (runs at http://localhost:3000).



Features

Interview Practice: Records audio answers via MediaRecorder, transcribes them using Google Cloud Speech-to-Text (WEBM_OPUS, 48kHz, mono, enhanced model), and generates feedback using Gemini API (gemini-1.5-flash).
Dashboard: Displays the number of interviews taken and job recommendations based on uploaded CV.
CV Parsing: Uploads PDF CVs, parses skills and experience using Gemini API, and provides tailored job recommendations.

Resolved Issues

Fixed MediaRecorder and Switch issues for reliable audio capture.
Resolved Flask async errors.
Addressed Vertex AI 404 error by switching to Gemini API.
Fixed IAM errors for roles/aiplatform.user and roles/speech.admin.
Corrected Speech-to-Text sample rate (48000 Hz), added mono audio, accent support, enhanced models, and speech contexts.
Fixed CV parsing error by ensuring JSON output and adding regex fallback.

Testing

Interview: Open http://localhost:3000, record a clear answer, and verify transcript/feedback.
Dashboard: Open http://localhost:3000/dashboard, upload a PDF CV, and verify interview count and job recommendations.
Debugging: Check debug_recording.webm for audio issues and Flask logs for CV parsing errors.

Screenshots

Interview interface with transcript and feedback.
Dashboard with interview count, CV upload, and job recommendations.

Notes

Ensure billing is enabled for Speech-to-Text enhanced models.
Use a clear, loud voice for recordings.
Upload a PDF CV with clear skills and experience sections.
Contact RakFort for deployment or styling requirements.
