# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import speech
import google.generativeai as genai
import os
import pdfplumber
import re
import json

app = Flask(__name__)
CORS(app)
speech_client = speech.SpeechClient()
genai.configure(api_key="get_from_env")  # Replace with your Gemini API key
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

JD_TEXT = """
Job Title: Software Engineer
Responsibilities: Develop and maintain software solutions, collaborate with cross-functional teams, ensure high-quality code.
Requirements: Proficiency in Python, React.js, cloud technologies; strong communication skills; AI/ML experience is a plus.
"""

# Mock interview count (can be replaced with database)
interview_count = 0

# Mock CV data
cv_data = {"skills": [], "experience": ""}

def evaluate_answer(candidate_name, position, question, answer):
    prompt = f"""
    You are an expert hiring manager providing constructive feedback for a candidate's interview answer to help them improve.
    **Candidate Name:** {candidate_name}
    **Applying for Position:** {position}
    **Job Description:** {JD_TEXT}
    **Question:** {question}
    **Answer:** {answer}
    **Task:** Provide a detailed evaluation with:
    - **Summary:** One sentence summarizing the answer's quality and relevance.
    - **Strengths:** 1-2 bullet points highlighting what was done well, even if minimal.
    - **Areas for Improvement:** 2-3 specific, actionable suggestions to address weaknesses and improve the response.
    - **Fit for Role:** A balanced assessment of suitability for the role, considering the answer and job requirements.
    - **Suggestions for Improvement:** Practical tips to enhance interview performance (e.g., structuring answers, using examples).
    - **Tone:** Be constructive, encouraging, and professional, avoiding overly critical language.
    """
    try:
        response = gemini_model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error during evaluation: {e}")
        return "Error generating feedback."

@app.route('/evaluate', methods=['POST'])
def evaluate_audio():
    global interview_count
    audio_file = request.files['audio']
    question = request.form['question']
    audio_data = audio_file.read()
    filename = audio_file.filename

    print(f"Received audio file: {filename}, size: {len(audio_data)} bytes")
    with open(f"debug_{filename}", "wb") as f:
        f.write(audio_data)
    print(f"Saved audio file: debug_{filename}")

    if filename.endswith('.ogg'):
        encoding = speech.RecognitionConfig.AudioEncoding.OGG_OPUS
        sample_rate = 48000
    elif filename.endswith('.webm'):
        encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
        sample_rate = 48000
    elif filename.endswith('.mp4'):
        encoding = speech.RecognitionConfig.AudioEncoding.MP4
        sample_rate = 44100
    else:
        print(f"Unsupported audio format: {filename}")
        return jsonify({"error": "Unsupported audio format"}), 400

    recognition_audio = speech.RecognitionAudio(content=audio_data)
    config = speech.RecognitionConfig(
        encoding=encoding,
        sample_rate_hertz=sample_rate,
        language_code="en-US",
        alternative_language_codes=["en-IN", "en-GB"],
        audio_channel_count=1,
        enable_automatic_punctuation=True,
        model="latest_long",
        use_enhanced=True,
        speech_contexts=[{
            "phrases": ["Python", "React", "software engineer", "cloud technologies", "AI", "ML"],
            "boost": 10.0
        }]
    )
    try:
        response = speech_client.recognize(config=config, audio=recognition_audio)
        if not response.results:
            print("Speech-to-Text: No transcription results returned")
            return jsonify({"transcript": "No transcript returned", "feedback": "No feedback due to transcription failure"}), 200
        transcript = " ".join([result.alternatives[0].transcript for result in response.results])
        print(f"Transcript: {transcript}")
    except Exception as e:
        print(f"Speech-to-Text error: {e}")
        return jsonify({"error": "Failed to transcribe audio"}), 500

    feedback = evaluate_answer("User", "Software Engineer", question, transcript)
    interview_count += 1

    return jsonify({
        "transcript": transcript,
        "feedback": feedback
    })

@app.route('/dashboard', methods=['GET'])
def dashboard():
    global interview_count, cv_data
    if cv_data["skills"]:
        cv_summary = f"Skills: {', '.join(cv_data['skills'])}. Experience: {cv_data['experience']}"
        prompt = f"""
        Based on this CV summary: {cv_summary}, recommend 3 relevant jobs for a Software Engineer role.
        Return the response as JSON with the following structure:
        [
            {{"title": "Job Title 1", "description": "Description 1"}},
            {{"title": "Job Title 2", "description": "Description 2"}},
            {{"title": "Job Title 3", "description": "Description 3"}}
        ]
        """
        try:
            response = gemini_model.generate_content(prompt)
            recommended_jobs = json.loads(response.text.strip('```json\n').strip('```'))
        except Exception as e:
            print(f"Error generating job recommendations: {e}")
            recommended_jobs = [
                {"title": "Software Engineer", "description": "Develop cutting-edge software solutions."},
                {"title": "AI Developer", "description": "Work on AI/ML projects with cloud technologies."},
                {"title": "Full Stack Developer", "description": "Build web applications using Python and React."}
            ]
    else:
        recommended_jobs = [
            {"title": "Software Engineer", "description": "Develop cutting-edge software solutions."},
            {"title": "AI Developer", "description": "Work on AI/ML projects with cloud technologies."}
        ]

    return jsonify({
        "interview_count": interview_count,
        "jobs": recommended_jobs
    })

@app.route('/upload_cv', methods=['POST'])
def upload_cv():
    global cv_data
    cv_file = request.files['cv']
    if not cv_file.filename.endswith('.pdf'):
        return jsonify({"error": "Only PDF files are supported"}), 400

    # Extract text from PDF
    text = ""
    with pdfplumber.open(cv_file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    # Use Gemini to parse CV
    prompt = f"""
    Parse this CV text into structured JSON data:
    {text}
    Return the response as JSON with the following structure:
    {{
        "skills": ["skill1", "skill2", ...],
        "experience": "Summary of experience"
    }}
    Ensure the response is valid JSON.
    """
    try:
        response = gemini_model.generate_content(prompt)
        # Strip any code block markers and parse JSON
        parsed_text = response.text.strip('```json\n').strip('```').strip()
        cv_data = json.loads(parsed_text)
        print(f"Parsed CV data: {cv_data}")
    except Exception as e:
        print(f"Error parsing CV: {e}")
        # Fallback parsing with regex
        skills = re.findall(r'\b(Python|React\.js|JavaScript|AWS|Azure|AI|ML|Django|Flask|Node\.js|SQL|NoSQL|Docker|Kubernetes)\b', text, re.IGNORECASE)
        experience_match = re.search(r'(Experience|Work History|Professional Experience)(.*?)(Education|Skills|$)', text, re.IGNORECASE | re.DOTALL)
        experience = experience_match.group(2).strip() if experience_match else "No experience details found."
        cv_data = {"skills": list(set(skills)), "experience": experience}
        print(f"Fallback CV data: {cv_data}")

    return jsonify({"message": "CV uploaded and parsed successfully"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)