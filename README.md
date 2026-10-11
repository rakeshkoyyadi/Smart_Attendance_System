# Smart Attendance System

## 📌 Project Overview

The Smart Attendance System is an AI-powered application that automates student attendance using face recognition and GPS-based classroom verification. It helps prevent proxy attendance, improves accuracy, and simplifies attendance management.

## ✨ Features

* 🔐 Secure student login and authentication
* 📱 OTP-based account verification and password management
* 📍 GPS-based classroom location verification
* 🤖 AI-powered face recognition
* 📷 Live webcam face verification
* 🕒 Session-based attendance tracking
* 📊 Attendance percentage and history
* 📁 Excel attendance reports
* 🗄️ MySQL database integration
* 🔒 Prevention of duplicate attendance

## 🛠️ Technologies Used

**Frontend**

* React.js
* HTML
* CSS
* JavaScript

**Backend**

* Node.js
* Express.js
* Python
* FastAPI

**Database**

* MySQL

**AI and Face Recognition**

* OpenCV
* DeepFace
* FaceNet512

**Other Tools**

* JWT Authentication
* GPS Geolocation API
* ExcelJS
* React Webcam

## ⚙️ Attendance Workflow

1. Student logs in to the application.
2. Student verifies their classroom location using GPS.
3. The system opens the webcam during an active attendance session.
4. AI face recognition verifies the student's identity.
5. The system checks the student ID and records attendance.
6. Attendance data is stored in MySQL and exported to Excel.
7. Students can view their attendance percentage and history.

## ⏰ Attendance Sessions

* **Morning:** 9:10 AM – 1:19 PM
* **Afternoon:** 1:20 PM – 6:00 PM

Face verification is available only during active sessions and after successful classroom location verification.

## 💻 Installation and Setup

### Prerequisites

* Node.js and npm
* Python 3
* MySQL Server
* Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd "Attendence System"
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Configure your `.env` file with your MySQL database credentials, JWT secret, and any required email settings.

### 3. Start the Node.js Backend

```bash
npm run dev
```

### 4. Start the Face Recognition API

Open another terminal and navigate to your Python `src` folder.

Activate your virtual environment on Windows:

```bash
..\env\Scripts\activate
```

Then start FastAPI:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

Adjust the virtual environment path if your folder structure differs.

### 5. Start the React Frontend

Open another terminal in the frontend project directory and run:

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## 🔑 Security Notes

* Keep database credentials and JWT secrets in environment variables.
* Never commit `.env` files, passwords, or private face datasets to GitHub.
* Backend routes must independently validate location, identity, and attendance-session rules.

## 🚀 Future Enhancements

* Admin and HOD dashboards
* Automated absent marking
* Early-exit notifications
* Cloud deployment
* Advanced anti-spoofing and liveness detection
* Downloadable attendance reports

## 👨‍💻 Project Purpose

This project aims to make college attendance more secure, accurate, and efficient by combining AI-based face recognition, location verification, and automated attendance management.

---

**Note:** Update the repository URL and installation paths to match your actual GitHub repository and folder structure before publishing.
