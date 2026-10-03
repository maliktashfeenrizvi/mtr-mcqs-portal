# CS MCQ Portal

Production-ready single-file MERN stack quiz application.

## Features

- **30 Computer Science MCQs** (Hardware, Networking, OS, Programming, Data Structures) – auto-seeded
- **One-attempt rule** per quiz version, identified by Name + Country + IP
- **Quiz versioning** – adding/editing/deleting questions automatically bumps version and resets attempts
- **Weekly progress** view (last 7 days)
- **Admin dashboard** for question & user management
- **Navy-blue modern UI** inspired by clean mobile quiz designs (progress bars, score circle, cards)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Ensure MongoDB is running (local or remote)
#    Optional: set connection string
export MONGODB_URI="mongodb://127.0.0.1:27017/cs_mcq_portal"
#    or create a .env file:
#    MONGODB_URI=mongodb://...

# 3. Start the server
npm start

# 4. Open in browser
http://localhost:3000
```

## Default Admin Credentials

- **Username:** `abuobaida313`
- **Password:** `abuobaida313`

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/start` | Check eligibility & get questions |
| POST | `/api/submit` | Submit answers & get score |
| POST | `/api/progress` | Weekly results by name+country |
| POST | `/api/admin/login` | Admin authentication |
| GET/POST/PUT/DELETE | `/api/admin/questions` | Question CRUD |
| GET/POST/DELETE | `/api/admin/users` | User management |

## Architecture

- Single `server.js` serves both Express REST API and React SPA (via CDN + Babel)
- MongoDB + Mongoose models: `User`, `Question`, `Result`, `Meta`
- IP detection: `x-forwarded-for` or socket remote address
- No build step required – pure Node.js

## Notes

- Changing any question (add/edit/delete) increments `quizVersion` and clears all `hasAttempted` flags so users can retake the updated quiz once.
- Results store full answer breakdown for review.
- Admin session token lives in memory (8 h) and is sent via `x-admin-token` header.
