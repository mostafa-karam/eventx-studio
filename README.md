# EventX Studio - Event Management System

A comprehensive full-stack event management system built with React, Node.js, and MongoDB. EventX Studio provides role-based access for both event organizers (Admins) and attendees (Users), featuring event creation, ticket booking, analytics, and reporting capabilities.

## 🚀 Features

### Admin Features

- **Dashboard**: Comprehensive overview with key metrics and quick actions
- **Event Management**: Create, edit, delete, and manage events with detailed information
- **Analytics**: Advanced analytics dashboard with interactive charts and visualizations
- **Reports**: Generate and export detailed reports (Revenue, Demographics, Performance, etc.)
- **User Management**: Manage attendees and user accounts
- **QR Code Generation**: Automatic QR code generation for ticket validation

### User Features

- **Event Discovery**: Browse and search events with filtering and sorting options
- **Event Details**: Detailed event information with booking interface
- **Ticket Booking**: Secure ticket booking with seat selection and payment simulation
- **My Tickets**: Manage booked tickets with QR codes for entry
- **User Dashboard**: Personal dashboard with quick stats and navigation

## 🛠 Tech Stack

### Frontend

- **React 19.1.0** - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **Recharts** - Data visualization library
- **Lucide React** - Beautiful icons
- **Vite** - Fast build tool and development server

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **QR Code** - QR code generation

## 📁 Project Structure

```str
eventx-studio/
├── frontend/
│   └── eventx-frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── admin/          # Admin-specific components
│       │   │   ├── user/           # User-specific components
│       │   │   └── ui/             # Reusable UI components
│       │   ├── contexts/           # React contexts
│       │   ├── pages/              # Page components
│       │   └── App.jsx             # Main application component
│       ├── public/                 # Static assets
│       └── package.json            # Frontend dependencies
├── backend/
│   ├── models/                     # Database models
│   ├── routes/                     # API routes
│   ├── middleware/                 # Custom middleware
│   ├── controllers/                # Route controllers
│   ├── config/                     # Configuration files
│   ├── server.js                   # Main server file
│   └── package.json                # Backend dependencies
└── README.md                       # Project documentation
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd eventx-studio
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install

   # Create environment file
   cp .env.example .env
   # Edit .env with your MongoDB connection string and JWT secret

   # Start the backend server
   npm run dev
   ```

3. **Frontend Setup**

   ```bash
   cd frontend/eventx-frontend
   npm install

   # Start the development server
   npm run dev
   ```

4. **Access the Application**
   - Frontend: <http://localhost:5173>
   - Backend API: <http://localhost:5000>

### Environment Variables

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/eventx-studio
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
NODE_ENV=development
```

## 📊 Database Models

### User Model

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin/user),
  profile: {
    phone: String,
    age: Number,
    city: String,
    interests: [String]
  }
}
```

### Event Model

```javascript
{
  title: String,
  description: String,
  category: String,
  date: Date,
  venue: {
    name: String,
    address: String,
    city: String,
    country: String
  },
  seating: {
    totalSeats: Number,
    availableSeats: Number
  },
  pricing: {
    type: String (free/paid),
    amount: Number
  },
  organizer: ObjectId (User),
  analytics: {
    views: Number,
    bookings: Number,
    revenue: Number
  }
}
```

### Ticket Model

```javascript
{
  user: ObjectId (User),
  event: ObjectId (Event),
  ticketNumber: String (unique),
  qrCode: String,
  quantity: Number,
  totalAmount: Number,
  bookingDate: Date,
  status: String (active/cancelled),
  checkIn: {
    status: Boolean,
    timestamp: Date
  }
}
```

## 🔐 Authentication & Authorization

The system implements JWT-based authentication with role-based access control:

- **Public Routes**: Registration, login
- **User Routes**: Event browsing, ticket booking, profile management
- **Admin Routes**: Event management, analytics, reports, user management

## 📱 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Events

- `GET /api/events` - Get all events (public)
- `GET /api/events/:id` - Get event details
- `POST /api/events/admin` - Create event (admin)
- `PUT /api/events/admin/:id` - Update event (admin)
- `DELETE /api/events/admin/:id` - Delete event (admin)

### Tickets

- `POST /api/tickets/book` - Book tickets
- `GET /api/tickets/my-tickets` - Get user tickets
- `POST /api/tickets/:id/checkin` - Check-in ticket

### Analytics

- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/reports` - Get reports list
- `POST /api/analytics/reports/generate` - Generate report

## 🎨 UI Components

The application uses a consistent design system with:

- **Color Palette**: Professional blue and gray tones
- **Typography**: Clean, readable fonts with proper hierarchy
- **Components**: Reusable UI components from shadcn/ui
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: ARIA labels and keyboard navigation support

## 📈 Analytics & Reporting

### Dashboard Analytics

- Total events, tickets sold, revenue, and attendees
- Growth rate indicators with trend arrows
- Interactive charts for revenue and sales data
- Event category distribution
- Demographic analysis

### Report Types

1. **Revenue Report** - Financial performance and trends
2. **Demographics Analysis** - Attendee demographics and insights
3. **Event Performance** - Success metrics and KPIs
4. **Sales Analysis** - Ticket sales patterns
5. **Attendance Report** - Attendance rates and patterns
6. **Feedback Summary** - Event feedback and ratings

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Admin registration and login
- [ ] Event creation and management
- [ ] Event browsing and filtering
- [ ] Ticket booking process
- [ ] QR code generation
- [ ] Analytics dashboard
- [ ] Report generation
- [ ] Responsive design
- [ ] Error handling

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the production version:

   ```bash
   cd frontend/eventx-frontend
   npm run build
   ```

2. Deploy the `dist` folder to your hosting platform

### Backend Deployment (Heroku/Railway)

1. Set environment variables on your hosting platform
2. Deploy the backend directory
3. Ensure MongoDB connection is configured

### Database Setup (MongoDB Atlas)

1. Create a MongoDB Atlas cluster
2. Configure network access and database user
3. Update the MONGODB_URI in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: EventX Studio Development Team
- **Project Type**: Full-Stack Event Management System
- **Framework**: MERN Stack (MongoDB, Express.js, React, Node.js)

## 📞 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

---

**EventX Studio** - Making event management simple and efficient! 🎉
