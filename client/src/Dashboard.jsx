// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [interviewCount, setInterviewCount] = useState(0);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [cvFile, setCvFile] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:5000/dashboard')
      .then((response) => response.json())
      .then((data) => {
        setInterviewCount(data.interview_count);
        setRecommendedJobs(data.jobs);
      })
      .catch((error) => console.error('Error fetching dashboard data:', error));
  }, []);

  const handleCvUpload = (e) => {
    setCvFile(e.target.files[0]);
  };

  const uploadCv = async () => {
    if (!cvFile) {
      alert('Please select a CV file');
      return;
    }

    const formData = new FormData();
    formData.append('cv', cvFile);

    try {
      const response = await fetch('http://127.0.0.1:5000/upload_cv', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setMessage(data.message || data.error);
      // Refresh dashboard to get new recommendations
      fetch('http://127.0.0.1:5000/dashboard')
        .then((response) => response.json())
        .then((data) => {
          setInterviewCount(data.interview_count);
          setRecommendedJobs(data.jobs);
        });
    } catch (error) {
      console.error('Error uploading CV:', error);
      setMessage('Failed to upload CV');
    }
  };

  return (
    <div className="Dashboard">
      <h1>User Dashboard</h1>
      <div className="stats">
        <h2>Interview Stats</h2>
        <p>Number of Interviews Taken: {interviewCount}</p>
      </div>
      <div className="cv-upload">
        <h2>Upload CV for Job Recommendations</h2>
        <input type="file" accept=".pdf" onChange={handleCvUpload} />
        <button onClick={uploadCv}>Upload CV</button>
        {message && <p>{message}</p>}
      </div>
      <div className="jobs">
        <h2>Recommended Jobs</h2>
        <ul>
          {recommendedJobs.map((job, index) => (
            <li key={index}>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;