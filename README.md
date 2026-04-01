<div align="center">

# 🎯 Assessment App - Secure Online Examination Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**A full-stack secure assessment system with real-time monitoring, violation detection, and comprehensive administration tools.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Project Structure](#-project-structure) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [📖 Project Overview](#-project-overview)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation Guide](#-installation-guide)
- [🔧 Configuration](#-configuration)
- [📡 API Documentation](#-api-documentation)
- [🔐 Security Features](#-security-features)
- [🐛 Troubleshooting](#-troubleshooting)
- [📝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 📖 Project Overview

**Assessment App** is a comprehensive, secure online examination platform designed to conduct assessments with real-time monitoring and cheating prevention. The platform provides:

- 👥 **Multi-role Users**: Support for administrators and candidates
- 📝 **Flexible Questions**: Multiple-choice (MCQ) and descriptive questions
- ⏱️ **Timed Assessments**: Automatic submission after duration expires
- 🚨 **Violation Detection**: Real-time monitoring for suspicious activities
- 📊 **Detailed Results**: Automatic scoring and performance analytics
- 🔒 **Enterprise Security**: JWT authentication and role-based access control

Perfect for educational institutions, corporate training, competitive exams, and recruitment assessments.

---

## ✨ Features

### 🎓 Core Features

- **User Management**
  - Multi-role authentication (Admin, Candidate)
  - JWT-based secure sessions
  - User profile management

- **Assessment Management**
  - Create and manage assessments
  - Set duration, pass percentage, and total marks
  - Support for multiple question types

- **Question Bank**
  - Multiple-choice questions (MCQ) with dynamic options
  - Descriptive/subjective questions
  - Per-question marking system
  - Easy question management

- **Exam Attempt Tracking**
  - In-progress attempt monitoring
  - Automatic time-based submission
  - Attempt history
  - Real-time progress tracking

- **Answer & Scoring**
  - Automatic MCQ evaluation
  - Descriptive answer storage for manual review
  - Instant result calculation
  - Score analytics

### 🔍 Security & Monitoring

- **Violation Detection System**
  - Tab switching detection
  - Window blur event tracking
  - Copy-paste prevention alerts
  - Right-click context menu blocking
  - Real-time violation logging

- **Authentication & Authorization**
  - JWT token-based authentication
  - Role-based access control (RBAC)
  - Secure password handling with bcrypt
  - Session management with cookies

### 📊 Admin Dashboard

- Assessment analytics
- Candidate management
- Violation reports
- Results and performance metrics
- Attempt history review

---

## 🛠 Tech Stack

### Frontend 🎨
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework for production |
| **React 19** | UI component library |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first CSS framework |
| **JWT** | Secure authentication |

### Backend 🔧
| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web application framework |
| **TypeScript** | Type-safe backend development |
| **PostgreSQL** | Relational database |
| **JWT** | Token-based authentication |
| **Bcrypt** | Password hashing |

### Tools & Libraries 🛠️
| Tool | Purpose |
|------|---------|
| **ESLint** | Code quality & linting |
| **PostCSS** | CSS processing |
| **Cookie Parser** | Cookie management |
| **CORS** | Cross-origin resource handling |
| **PG** | PostgreSQL client for Node.js |

---

## 📁 Project Structure

```
assessment-app/
├── 📂 frontend/                    # Next.js frontend application
│   ├── src/app/
│   │   ├── login/                 # Login page
│   │   ├── assessment/
│   │   │   ├── start/             # Start assessment
│   │   │   ├── attempt/           # Take exam
│   │   │   └── rules/             # Assessment rules
│   │   ├── admin/                 # Admin dashboard
│   │   │   ├── assessments/       # Manage assessments
│   │   │   └── attempts/          # View attempts
│   │   └── results/               # Results page
│   ├── src/hooks/                 # Custom React hooks
│   │   ├── useAuth.ts             # Authentication logic
│   │   ├── useAdmin.ts            # Admin features
│   │   ├── useTimer.ts            # Exam timer
│   │   ├── useFullscreen.ts       # Fullscreen mode
│   │   └── useViolation.ts        # Violation detection
│   ├── src/services/              # API service layer
│   ├── src/types/                 # TypeScript interfaces
│   └── package.json
│
├── 📂 backend/                     # Express.js backend API
│   ├── src/
│   │   ├── index.ts               # Application entry point
│   │   ├── api/
│   │   │   ├── controllers/       # Route controllers
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── attempt.controller.ts
│   │   │   │   ├── admin.controller.ts
│   │   │   │   ├── result.controller.ts
│   │   │   │   └── violation.controller.ts
│   │   │   ├── middlewares/       # Custom middlewares
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── role.middleware.ts
│   │   │   │   └── timer.middleware.ts
│   │   │   └── routes/            # API route definitions
│   │   ├── services/              # Business logic
│   │   │   ├── scoring.service.ts
│   │   │   ├── result.service.ts
│   │   │   ├── finalizeAttempt.service.ts
│   │   │   ├── timer.service.ts
│   │   │   └── violation.service.ts
│   │   ├── config/                # Configuration files
│   │   │   ├── db.ts              # Database connection
│   │   │   └── index.ts           # Config loader
│   │   └── utils/
│   │       └── jwt.ts             # JWT utilities
│   ├── schema.sql                 # Database schema
│   └── package.json
│
├── 📂 app/                        # Root Next.js app configuration
├── package.json                   # Root dependencies
├── tsconfig.json                  # TypeScript config
├── eslint.config.mjs              # ESLint configuration
├── next.config.ts                 # Next.js configuration
├── postcss.config.mjs             # PostCSS configuration
└── README.md                      # This file
```

### 🗄️ Database Schema

**Core Tables:**
- `users` - User accounts and roles
- `assessments` - Assessment definitions
- `questions` - MCQ and descriptive questions
- `attempts` - Exam attempt records
- `answers` - Candidate responses
- `violations` - Suspicious activity logs
- `results` - Final scores and analytics

---

## 🚀 Quick Start

### Prerequisites ✅
- **Node.js** 18+ and **npm** or **yarn**
- **PostgreSQL** 12+
- **Git**

### 5-Minute Setup

#### 1️⃣ Clone & Install
```bash
# Clone repository
git clone <repository-url>
cd assessment-app

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

#### 2️⃣ Setup Database
```bash
# Create PostgreSQL database
createdb assessment_db

# Run schema (from backend folder)
cd backend
psql -U <your_user> -d assessment_db -f schema.sql
cd ..
```

#### 3️⃣ Configure Environment Variables

**Backend** - Create `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/assessment_db
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=1h
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### 4️⃣ Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

#### 5️⃣ Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000/api

---

## 📦 Installation Guide

### Detailed Setup Instructions

#### Frontend Setup 🎨

```bash
cd frontend

# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Production build
npm build

# Production server
npm start

# Lint code
npm run lint
```

**Required Ports**: 3000

#### Backend Setup 🔧

```bash
cd backend

# Install dependencies
npm install

# Development server with auto-restart (ts-node-dev)
npm run dev

# Build TypeScript to JavaScript
npm build

# Run production build
npm start
```

**Required Ports**: 5000 (configurable)

### Database Setup 🗄️

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE assessment_db;

# Connect to database
\c assessment_db

# Run schema
\i schema.sql

# Verify tables
\dt
```

---

## 🔧 Configuration

### Environment Variables

#### Backend Configuration (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development|production|test

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/assessment_db
DB_MAX_CONNECTIONS=20

# JWT & Security
JWT_SECRET=your_complex_secret_key_min_32_chars
JWT_EXPIRY=1h
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Session
COOKIE_SECURE=false|true
COOKIE_SAME_SITE=strict|lax|none
```

#### Frontend Configuration (`frontend/.env.local`)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=Assessment App

# Feature Flags
NEXT_PUBLIC_ENABLE_FULLSCREEN=true
NEXT_PUBLIC_VIOLATION_MONITORING=true
```

---

## 📡 API Documentation

### Authentication Endpoints 🔐

#### Login
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "candidate|admin"
  }
}
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer <token>

Response (200):
{
  "message": "Logged out successfully"
}
```

### Assessment Endpoints 📝

#### Get All Assessments
```
GET /api/assessments
Authorization: Bearer <token>

Response (200):
{
  "assessments": [
    {
      "id": "uuid",
      "title": "Java Fundamentals",
      "duration_minutes": 60,
      "total_marks": 100,
      "pass_percentage": 40
    }
  ]
}
```

#### Get Assessment by ID
```
GET /api/assessments/:id
Authorization: Bearer <token>
```

#### Create Assessment (Admin Only)
```
POST /api/assessments
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Assessment Name",
  "description": "Description",
  "duration_minutes": 60,
  "total_marks": 100,
  "pass_percentage": 40
}
```

### Attempt Endpoints ⏱️

#### Start Attempt
```
POST /api/attempts
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "assessment_id": "uuid"
}

Response (201):
{
  "attempt_id": "uuid",
  "started_at": "2024-01-15T10:00:00Z",
  "ends_at": "2024-01-15T11:00:00Z"
}
```

#### Submit Answer
```
POST /api/attempts/:attemptId/answers
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "question_id": "uuid",
  "answer": "option_a|descriptive_text"
}
```

#### Get Attempt Progress
```
GET /api/attempts/:attemptId
Authorization: Bearer <token>
```

### Results Endpoints 📊

#### Get Results
```
GET /api/results/attempt/:attemptId
Authorization: Bearer <token>

Response (200):
{
  "score": 75.5,
  "total_marks": 100,
  "pass_status": "passed|failed",
  "answers": [{ question_id, answer, is_correct, marks_obtained }]
}
```

### Violations Endpoints 🚨

#### Report Violation
```
POST /api/violations
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "attempt_id": "uuid",
  "violation_type": "tab_switch|copy_paste|right_click|fullscreen_exit",
  "description": "User switched tabs"
}
```

#### Get Violations (Admin)
```
GET /api/violations/attempt/:attemptId
Authorization: Bearer <token>
Role: admin
```

---

## 🔐 Security Features

### 🛡️ Authentication & Authorization
- **JWT Tokens**: Stateless, secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Role-Based Access Control**: Admin vs Candidate roles
- **Token Expiration**: Configurable JWT expiry (default: 1 hour)
- **Secure Cookies**: HttpOnly, Secure, SameSite flags

### 🚨 Violation Detection System
Monitors for examination integrity issues:
- **Tab Switching**: Detects when user switches browser tabs
- **Window Blur**: Alerts when candidate leaves the browser window
- **Copy-Paste Prevention**: Blocks copy-paste operations
- **Right-Click Blocking**: Disables right-click context menu
- **Fullscreen Enforcement**: Required fullscreen mode (optional)
- **Real-time Logging**: All violations logged to database

### 🔒 Input Validation
- Form validation on frontend and backend
- SQL injection prevention (parameterized queries)
- XSS protection through React's built-in escaping
- CORS configuration for cross-origin requests

### ⏱️ Timing & Session Security
- Server-side timer validation
- Automatic session expiration
- Attempt timeout enforcement
- Session hijacking prevention

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Backend Connection Issues

**Problem**: `connect ECONNREFUSED 127.0.0.1:5432`
```bash
# PostgreSQL not running
# Solution: Start PostgreSQL service

# Windows
net start postgresql-x64-15

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

#### Database Not Found

**Problem**: `database "assessment_db" does not exist`
```bash
# Solution: Create the database
createdb assessment_db
psql -U postgres -d assessment_db -f backend/schema.sql
```

#### JWT Authorization Errors

**Problem**: `jwt malformed` or `jwt expired`
```
- Verify JWT_SECRET in .env matches
- Check token expiration time
- Ensure token is in Authorization header: Bearer <token>
```

#### CORS Errors

**Problem**: `Access to XMLHttpRequest blocked by CORS policy`
```
Solution: Update CORS_ORIGIN in backend/.env:
CORS_ORIGIN=http://localhost:3000,http://your-domain.com
```

#### Port Already in Use

**Problem**: `Port 3000/5000 is already in use`
```bash
# Find and kill process (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Module Not Found

**Problem**: `Cannot find module 'express'`
```bash
# Solution: Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### API Connection Issues

**Problem**: `Cannot GET /api/assessments`
```
Check backend is running:
- Verify backend server started (check Terminal output)
- Confirm NEXT_PUBLIC_API_URL is correct
- Test: curl http://localhost:5000/api/auth/login
```

### Debug Mode

**Enable verbose logging:**

```typescript
// backend/src/config/index.ts
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Full request body:', req.body);
  console.log('Database query:', query);
}
```

### Getting Help

1. Check logs in terminal/console
2. Use browser DevTools (Network, Console tabs)
3. Review error stack traces
4. Check database with: `psql assessment_db`

---

## 📝 Contributing

We welcome contributions! Follow these steps:

### 1. Fork & Clone
```bash
git clone <your-fork-url>
cd assessment-app
```

### 2. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes
- Follow project code style (TypeScript, ESLint)
- Write clear commit messages
- Add tests if applicable

### 4. Commit & Push
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 5. Create Pull Request
- Provide clear description
- Reference related issues
- Request review

### Code Style Guidelines

```typescript
// Use TypeScript strict mode
// Follow ESLint rules
// Use meaningful variable names
// Add JSDoc comments for complex functions
```

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🤝 Support & Community

- **GitHub Issues**: Report bugs and suggest features
- **Documentation**: Check backend and frontend README files
- **Email Support**: Contact development team

---

<div align="center">

### Made with ❤️ by the Assessment Team

⭐ If you find this project helpful, please star it on GitHub!

[Back to Top](#-assessment-app---secure-online-examination-platform)

</div>
