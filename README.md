# KontactShare Server API

Backend API for the KontactShare application built with Node.js, Express, and Supabase.

## Features

- **Profile Management**: Create, read, update, and delete user profiles
- **File Upload**: Upload profile photos with validation
- **Authentication**: PIN-based authentication system
- **Public Access**: Public profile viewing via unique codes
- **Database Integration**: Supabase PostgreSQL database
- **TypeScript**: Full TypeScript support with type safety

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Profile Management
- `GET /api/profiles/:uniqueCode` - Get public profile by unique code
- `POST /api/profiles` - Create new profile (admin)
- `PUT /api/profiles/:uniqueCode` - Update profile (owner)
- `DELETE /api/profiles/:uniqueCode` - Delete profile (admin)

### Authentication & Security
- `POST /api/profiles/:uniqueCode/verify` - Verify ID + PIN credentials
- `PUT /api/profiles/:uniqueCode/pin` - Change PIN

### File Upload
- `POST /api/profiles/:uniqueCode/upload` - Upload profile photo

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the server directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=3001
```

### 2. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `database-schema.sql` in your Supabase SQL editor
3. Update your `.env` file with the correct Supabase credentials

### 3. Install Dependencies

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

### 5. Production Build

```bash
npm run build
npm start
```

## Database Schema

The application uses a single `profiles` table with the following structure:

- `id` - UUID primary key
- `admin_id` - Unique admin-generated ID (e.g., "20251001-0000-0001")
- `pin` - 5-digit PIN for authentication
- `unique_code` - 24-character unique code for public URLs
- Profile information fields (name, email, job, company, etc.)
- Social media links
- Timestamps and status

## File Upload

- Maximum file size: 5MB
- Allowed file types: Images only
- Upload directory: `./uploads/`
- Files are served statically at `/uploads/`

## Security Features

- CORS enabled for cross-origin requests
- File type validation for uploads
- File size limits
- Row Level Security (RLS) in Supabase
- Input validation and sanitization

## Error Handling

The API includes comprehensive error handling for:
- Database connection issues
- Invalid file uploads
- Authentication failures
- Missing or invalid data
- Server errors

## Development

The server uses:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Supabase** - Database and authentication
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Testing

Test the API endpoints using tools like Postman or curl:

```bash
# Health check
curl http://localhost:3001/api/health

# Get profile
curl http://localhost:3001/api/profiles/gsdbhb7390bcsdhjughu

# Create profile
curl -X POST http://localhost:3001/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"id":"20251001-0000-0006","pin":"12345","uniqueCode":"test123","fullName":"Test User",...}'
```
