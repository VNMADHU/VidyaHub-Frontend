# Frontend API Integration

The frontend is now connected to the backend via API client. 

## Environment Variables

Create `.env.local` in the frontend folder:

```
VITE_API_URL=http://localhost:5000/api
```

## API Client

Located at: `src/services/apiClient.js`

Handles all HTTP requests with:
- Automatic JSON serialization
- School ID headers
- Error handling
- localStorage token management

## Available Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/otp` - Request OTP

### Schools
- `GET /api/schools` - List schools
- `POST /api/schools` - Create school
- `PATCH /api/schools/:id/status` - Update status

### Students
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `PATCH /api/students/:id` - Update student

### Teachers
- `GET /api/teachers` - List teachers
- `POST /api/teachers` - Create teacher
- `PATCH /api/teachers/:id` - Update teacher

### Attendance
- `POST /api/attendance` - Record attendance
- `GET /api/attendance/summary` - Get summary

### Marks
- `POST /api/marks` - Create marks
- `GET /api/marks/report` - Get report

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event

### Announcements
- `GET /api/announcements` - List announcements
- `POST /api/announcements` - Create announcement

## State Management

### useAuthStore
- Stores user, token, role, schoolId
- Methods: login(), logout(), setError()

### useDataStore
- Stores students, teachers, schools, events, announcements
- Methods: setStudents(), setTeachers(), etc.

## Using API in Components

```javascript
import apiClient from '../services/apiClient'

// In component
const handleLogin = async () => {
  try {
    const response = await apiClient.login(email, password, role)
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

## Testing

1. Backend running: `http://localhost:5000`
2. Frontend running: `http://localhost:5173`
3. Login form now calls backend
4. Check backend logs in: `vidya-hub-backend/logs/combined.log`
