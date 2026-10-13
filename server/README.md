# DayLedger Backend API & MongoDB Architecture

A structured Express.js and Mongoose backend for **DayLedger — Personal Tasks & Money Manager**.

## Connection String
```env
MONGODB_URI=mongodb://localhost:27017/dayledger
PORT=5000
```

---

## Architecture & Folder Structure

```
server/
├── .env                  # Environment configuration
├── package.json          # Express, Mongoose, CORS, Dotenv dependencies
└── src/
    ├── index.js          # Express server entry point (Port 5000)
    ├── config/
    │   └── db.js         # Mongoose connection manager with auto-retry
    ├── models/
    │   ├── Task.js       # Task schema (status, priority, categories, due dates)
    │   ├── Person.js     # Contact ledger profile schema
    │   ├── MoneyTransaction.js # Lent/Borrowed records & repayment history
    │   ├── Note.js       # Personal notes & tagging schema
    │   ├── Activity.js   # Chronological audit log schema
    │   └── UserProfile.js# User preferences (currency, name, email)
    └── routes/
        └── api.js        # REST API endpoints & bulk data synchronization
```

---

## Mongoose Schemas & Models

### 1. `Task` (`server/src/models/Task.js`)
- `id`: Unique task ID
- `title`: String (required)
- `description`: String (optional)
- `status`: `'todo'` | `'in_progress'` | `'completed'`
- `priority`: `'low'` | `'medium'` | `'high'`
- `category`: `'Personal'` | `'College'` | `'Work'` | `'Finance'` | `'Health'` | `'Other'`
- `dueDate`: String (`YYYY-MM-DD`)
- `completedAt`: ISO Timestamp
- `notes`: String

### 2. `Person` (`server/src/models/Person.js`)
- `id`: Unique contact ID
- `name`: String (required)
- `phone`: String
- `email`: String
- `notes`: String

### 3. `MoneyTransaction` (`server/src/models/MoneyTransaction.js`)
- `id`: Unique transaction ID
- `personId`: String
- `personName`: String
- `type`: `'LENT'` | `'BORROWED'`
- `amount`: Number
- `paidAmount`: Number (tracks partial repayments)
- `date`: String (`YYYY-MM-DD`)
- `expectedReturnDate`: String (`YYYY-MM-DD`)
- `status`: `'pending'` | `'partially_paid'` | `'paid'` | `'overdue'`
- `category`: `'Personal'` | `'Friends'` | `'Family'` | `'Travel'` | `'Food'` | `'College'` | `'Other'`
- `notes`: String
- `paymentHistory`: Subdocument array of `{ id, amount, date, note }`

### 4. `Note` (`server/src/models/Note.js`)
- `id`: Unique note ID
- `title`: String
- `content`: String
- `tags`: Array of string tags (`#Rahul`, `#Finance`, `#College`)
- `personId`: Associated contact (optional)
- `taskId`: Associated task (optional)
- `isPinned`: Boolean

### 5. `Activity` (`server/src/models/Activity.js`)
- `id`: Unique activity ID
- `type`: `'task'` | `'money'` | `'note'` | `'person'`
- `action`: String
- `description`: String
- `timestamp`: ISO timestamp

### 6. `UserProfile` (`server/src/models/UserProfile.js`)
- `name`: String (default: `'Madhav'`)
- `email`: String
- `currency`: String (default: `'₹'`)
- `currencyCode`: String (default: `'INR'`)

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Checks MongoDB connection status |
| `GET` | `/api/all` | Bulk fetches tasks, people, transactions, notes, and profile |
| `POST` | `/api/seed` | Seeds or resets demo data in MongoDB |
| `GET / POST` | `/api/tasks` | Get all tasks or create a new task |
| `PUT / DELETE` | `/api/tasks/:id` | Update or delete a task |
| `GET / POST` | `/api/people` | Get all contacts or create a contact |
| `PUT / DELETE` | `/api/people/:id` | Update or delete a contact |
| `GET / POST` | `/api/transactions` | Get transactions or record lent/borrowed money |
| `PUT / DELETE` | `/api/transactions/:id` | Update or delete a transaction |
| `POST` | `/api/transactions/:id/payment`| Record partial or full repayment |
| `GET / POST` | `/api/notes` | Get all notes or create a note |
| `PUT / DELETE` | `/api/notes/:id` | Update or delete a note |
| `GET / PUT` | `/api/profile` | Get or update user profile and currency |
| `GET / POST` | `/api/activities` | Get activity audit timeline |

---

## How to Run

1. **Start MongoDB**:
   Make sure MongoDB is running on your machine:
   ```powershell
   net start MongoDB
   # or
   mongod --dbpath <data_path>
   ```

2. **Run Backend Server**:
   ```powershell
   npm run server
   ```
   Server will run on `http://localhost:5000` and automatically connect to `mongodb://localhost:27017/dayledger`.

3. **Run Frontend**:
   ```powershell
   npm run dev
   ```
   Runs on `http://localhost:5173/` and proxies all `/api/*` calls to the backend.
