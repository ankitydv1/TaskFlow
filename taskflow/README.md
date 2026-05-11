# TaskFlow — Full-Stack Project Management Application

A complete project management system built with React, Node.js, Express, and MongoDB.

---

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, TanStack Query, React Router v6, Recharts, React Hot Toast  
**Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Helmet, express-validator

---

## Project Structure

```
taskflow/
├── backend/
│   ├── config/         # Database connection
│   ├── controllers/    # Business logic
│   ├── middleware/     # Auth, error handling
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routers
│   └── server.js       # Entry point
└── frontend/
    └── src/
        ├── components/ # Reusable UI components
        ├── contexts/   # React context (Auth)
        ├── pages/      # Route-level pages
        └── utils/      # Axios instance
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## Environment Variables (backend/.env)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile |
| PUT | /api/auth/change-password | Change password |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List all accessible projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get single project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/members | Add member |
| DELETE | /api/projects/:id/members/:userId | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks/my | Get my tasks |
| GET | /api/tasks/project/:projectId | Get project tasks |
| POST | /api/tasks/project/:projectId | Create task |
| GET | /api/tasks/:id | Get task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| POST | /api/tasks/:id/comments | Add comment |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List users |
| GET | /api/users/:id | Get user |
| PUT | /api/users/:id/role | Update role (admin) |
| PUT | /api/users/:id/deactivate | Deactivate user (admin) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Get dashboard stats |

---

## Role-Based Access Control

| Feature | Member | Manager | Admin |
|---------|--------|---------|-------|
| View projects they belong to | ✓ | ✓ | ✓ |
| Create projects | ✓ | ✓ | ✓ |
| Manage project members | — | ✓ | ✓ |
| Delete own project | ✓ | ✓ | ✓ |
| Delete any project | — | — | ✓ |
| Create/edit tasks in project | ✓ | ✓ | ✓ |
| Delete own tasks | ✓ | ✓ | ✓ |
| Change user roles | — | — | ✓ |
| Deactivate users | — | — | ✓ |

---

## Features

- JWT authentication with secure token storage
- Role-based access control (Admin / Manager / Member)
- Project management with status, priority, color labels
- Kanban board with 4 columns (Todo / In Progress / Review / Done)
- Task assignment, due dates, estimated hours, comments
- Dashboard with Pie and Bar charts (Recharts)
- Project progress bars
- Team member management
- Full form validation (frontend + backend)
- Loading states, empty states, error handling
- Rate limiting, Helmet security headers
- Fully responsive — mobile first
