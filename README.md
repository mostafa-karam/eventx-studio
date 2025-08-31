# 🎟️ EventX Studio - Premium Event Management Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-username/eventx-studio/actions)
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
- **Event Management**: Full CRUD operations with rich text editing and media uploads
- **Marketing Center**: Create and manage email campaigns with performance tracking
- **User Management**: Role-based access control with advanced options
- **Notifications System**: Centralized, filterable notification center
- **QR Code System**: Secure QR generation and validation for tickets
- **Support Center**: Ticketing system with FAQs and contact options

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

- **React 19.1.0** · **Tailwind CSS** · **shadcn/ui** · **Recharts** · **Lucide Icons** · **Vite** · **Radix UI** · **React Hook Form** · **Zod**

### ⚙️ Backend

- **Node.js 18+** · **Express.js** · **MongoDB 6.0+** · **Mongoose** · **JWT** · **bcryptjs** · **Nodemailer** · **Winston** · **ua-parser-js** · **Jest & Supertest**

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
cp .env.example .env   # Add MongoDB URI & JWT secret
npm run dev
```

## **Frontend Setup**

```bash
cd frontend/eventx-frontend
npm install
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

OpenAPI (Swagger) available. Example endpoints:

- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/events` - Fetch events
- `POST /api/v1/tickets` - Purchase tickets
- `GET /api/v1/analytics/dashboard` - Dashboard metrics

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

- **Frontend**: React Testing Library, Cypress, axe-core
- **Backend**: Jest, Supertest, k6, OWASP ZAP
- **Coverage**: Frontend 85%+, Backend 90%+

---

## 🚀 Deployment Guide

### Production Deployment

**Docker (Recommended):**

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

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
