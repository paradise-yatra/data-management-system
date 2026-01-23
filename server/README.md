# Backend Server

This is the Node.js/Express backend server for the Identity Management System.

## Setup

1. Install dependencies:
```bash
npm install express mongoose cors dotenv concurrently
```

2. Create a `.env` file in the root directory with:
```
MONGODB_URI=mongodb+srv://dikshusharma11:dikshant1140@cluster0.w6ybkdx.mongodb.net/Identity-Management-System
PORT=3001
```

3. Start the server:
```bash
npm run dev:server
```

Or run both frontend and backend together:
```bash
npm run dev:all
```

## API Endpoints

### Sources

- `GET /api/sources` - Get all sources
- `POST /api/sources` - Create a new source
- `PUT /api/sources/bulk` - Update all sources (bulk operation)
- `DELETE /api/sources/:name` - Delete a source by name

## Database

- Database: `Identity-Management-System`
- Collection: `sources`

