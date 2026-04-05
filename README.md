# 🎟️ EventX Studio - Premium Event Management Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/mostafa-karam/eventx-studio/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://react.dev/)

A comprehensive, secure, and scalable full-stack event management solution built with modern web technologies. EventX Studio provides a seamless experience for both event organizers (Admins) and attendees (Users), featuring advanced event management, secure authentication, real-time analytics, and comprehensive reporting capabilities.

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚦 Getting Started](#-getting-started)
- [🔒 Advanced Security & Authentication](#-advanced-security--authentication)
- [🌐 API Documentation](#-api-documentation)
- [🎨 UI Components](#-ui-components)
- [📈 Analytics & Reporting](#-analytics--reporting)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [🚀 Deployment Guide](#-deployment-guide)

---

## ✨ Features

### 👨‍💼 Admin Features

- **Dashboard**: Real-time analytics with KPIs, recent activities, and quick actions
- **Event Management**: Advanced lifecycle control with atomic cancellations and field locking for published events.
- **Marketing Center**: Create and manage email campaigns with performance tracking.
- **User Management**: Role-based access control with standardized status handling.
- **Notifications System**: Global event notifications for cancellations and updates.
- **QR Code System**: Secure QR generation and atomic check-in validation.
- **Support Center**: Ticketing system with FAQs and contact options.

### 👥 User Features

- **Event Discovery**: Advanced search with filters (category, date, location)
- **Event Details**: Interactive maps, social sharing, and details
- **Favorites**: Save and manage favorite events
- **Ticket Management**: View, download, and manage all tickets
- **Personal Dashboard**: Upcoming events, history, and recommendations
- **Profile & Security**: Manage personal info, active sessions, and 2FA

---

## 🛠 Tech Stack

### 🖥️ Frontend

- **React 18.3.1** · **Tailwind CSS 4.1** · **shadcn/ui** · **Recharts** · **Lucide Icons** · **Vite 6.3** · **Radix UI** · **React Hook Form** · **Zod**

### ⚙️ Backend

- **Node.js 18+** · **Express.js 4.21** · **MongoDB 6.0+** · **Mongoose 8.17** · **JWT** · **bcryptjs 3.0** · **Nodemailer 8.0** · **Winston 3.17** · **file-type 18.7**

---

## 📁 Project Structure

```str
eventx-studio/
├── frontend/
│   └── eventx-frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── admin/
│       │   │   ├── user/
│       │   │   └── ui/
│       │   ├── contexts/
│       │   ├── pages/
│       │   └── App.jsx
│       ├── public/
│       └── package.json
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── config/
│   ├── server.js
│   └── package.json
└── README.md
```

---

## 🚦 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
git clone <repository-url>
cd eventx-studio
```

## **Backend Setup**

```bash
cd backend
npm install
# Ensure .env is configured (see .env.example)
npm run dev
```

## **Frontend Setup**

```bash
cd frontend/eventx-frontend
npm install
# Ensure .env is configured (see .env.example)
npm run dev
```

Access: [Frontend](http://localhost:5173) · [Backend API](http://localhost:5000)

---

## 🔒 Advanced Security & Authentication

- **MFA (2FA)** support
- **Account Lockout** after failed logins
- **Session Management** with device tracking
- **RBAC**: role-based permissions
- **Rate Limiting**, **CORS**, **CSRF**, **Security Headers**

---

## 🌐 API Documentation

OpenAPI (Swagger) available at `/api-docs`. Core endpoints:

- `POST /api/auth/register` - User registration
- `GET /api/events` - Fetch events
- `POST /api/tickets/book` - Purchase tickets
- `GET /api/analytics/dashboard` - Dashboard metrics
- `POST /api/payments/process` - Process payment
- `POST /api/booking/confirm` - Confirm booking

---

## 🎨 UI Components

- **Design System**: Blue & gray palette, clean typography
- **Responsive Design**: Mobile-first with Tailwind
- **Accessibility**: WCAG 2.1 AA + ARIA labels

---

## 📈 Analytics & Reporting

- **Dashboards**: Revenue, attendees, sales, demographics
- **Reports**: Revenue, demographics, performance, feedback

---

## 🧪 Testing & Quality Assurance

- **Backend**: Jest + Supertest (integration tests against `mongodb-memory-server`)
- **Frontend**: ESLint for static analysis
- **Run backend tests**: `cd backend && npm test`
- **Run frontend lint**: `cd frontend/eventx-frontend && npx eslint .`
---

## 🚀 Deployment Guide

### Production Deployment

**Manual Deployment:**

- Build frontend: `npm run build`
- Serve with **Nginx** + run backend with **PM2**

Example Nginx Config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

---
