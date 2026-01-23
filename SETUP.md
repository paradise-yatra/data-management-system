# Backend Setup Instructions

## Step 1: Install Backend Dependencies

**Run this command in the root folder** (not in the server folder):

```bash
npm install
```

This will install all dependencies including:
- express
- mongoose
- cors
- dotenv
- concurrently
- jsonwebtoken
- bcryptjs
- cookie-parser

> **Note**: All dependencies are managed in the root `package.json` file, so you only need to run `npm install` once in the root directory.

## Step 2: Create .env File

Create a `.env` file in the root directory with the following content:

```
MONGODB_URI=mongodb+srv://dikshusharma11:dikshant1140@cluster0.w6ybkdx.mongodb.net/Identity-Management-System
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:8080
```

> **IMPORTANT**: Change `JWT_SECRET` to a secure random string in production!

## Step 3: Create the First Admin User

Before you can log in, you need to create an admin user:

```bash
npm run create:admin
```

This will create a default admin user with:
- **Email**: admin@paradiseyatra.com
- **Password**: Admin@123

> **IMPORTANT**: Change this password after first login!

You can also set custom admin credentials via environment variables:
```
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourSecurePassword
ADMIN_NAME=Your Name
```

## Step 4: Start the Backend Server

You can start the backend server in two ways:

### Option 1: Start backend only
```bash
npm run dev:server
```

### Option 2: Start both frontend and backend together
```bash
npm run dev:all
```

The backend will run on `http://localhost:3001` and the frontend will run on `http://localhost:8080`.

## Step 5: Login

Navigate to `http://localhost:8080/login` and sign in with your admin credentials.

## Authentication System

The system uses JWT-based authentication with role-based access control.

### User Roles
- **Admin**: Full access to all features, can manage users
- **Manager**: Access to all identity management features
- **User**: Basic access to view and manage identities

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

#### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `PUT /api/users/:id/role` - Change user role

#### Sources (Authenticated)
- `GET /api/sources` - Get all sources
- `POST /api/sources` - Create a new source
- `PUT /api/sources/bulk` - Update all sources (bulk operation)
- `DELETE /api/sources/:name` - Delete a source by name

#### Identities (Authenticated)
- `GET /api/identities` - Get all identities
- `GET /api/identities/:id` - Get a single identity
- `POST /api/identities` - Create a new identity
- `PUT /api/identities/:id` - Update an identity
- `DELETE /api/identities/:id` - Delete an identity

#### Trash (Authenticated)
- `GET /api/trash` - Get all trash records
- `POST /api/trash` - Add a record to trash
- `POST /api/trash/:id/restore` - Restore a record from trash
- `DELETE /api/trash/:id` - Permanently delete a record
- `DELETE /api/trash` - Empty trash

## Database

- **Database Name**: `Identity-Management-System`
- **Collections**:
  - `users` - User accounts
  - `sources` - Lead sources
  - `identities` - Identity records
  - `trash` - Deleted records

The collections will be automatically created when data is first saved.

