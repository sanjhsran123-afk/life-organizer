# DayLedger — Personal Productivity & Financial Suite

DayLedger is an elegant, unified personal productivity application that combines task management, lent and borrowed financial tracking, contacts, notes, and activity timeline.

---

## 🚀 Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, Mongoose (MongoDB ODM), bcryptjs, jsonwebtoken
- **Database**: Local MongoDB server (`mongodb://localhost:27017/dayledger`)
- **Inspection Tool**: MongoDB Compass

---

## 🔐 Authentication & Account System

### Sign-Up Fields Collected
- **Full Name**: String, trimmed, min 2 characters.
- **Age**: Positive integer (1–130).
- **Date of Birth**: ISO date string (`YYYY-MM-DD`). Cannot be in the future.
- **Email Address**: Normalized lowercase email address with RFC-compliant validation.
- **Phone Number**: Normalized telephone number (10 to 15 digits, e.g. `+919876543210`).
- **Password**: Min 6 characters, securely hashed with bcrypt salt 10.
- **Confirm Password**: Verified to match password exactly.

### Age Accuracy & Consistency Logic
1. **Client & Server Consistency**: During registration, the application calculates the expected age based on `dateOfBirth` and verifies that the entered `age` matches within 1 year (allowing for calendar day boundary / timezone variances).
2. **Dynamic Age Accuracy**: Both the entered `age` and `dateOfBirth` are stored in MongoDB. The Mongoose schema provides a dynamic virtual getter `currentAge`:
   ```javascript
   userSchema.virtual('currentAge').get(function () {
     if (!this.dateOfBirth) return this.age;
     const today = new Date();
     const birthDate = new Date(this.dateOfBirth);
     let computedAge = today.getFullYear() - birthDate.getFullYear();
     const monthDiff = today.getMonth() - birthDate.getMonth();
     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
       computedAge--;
     }
     return computedAge;
   });
   ```
   This guarantees that as a user's birthday passes in subsequent months and years, their age remains 100% accurate without requiring manual database updates.

### Uniqueness & Duplicate Prevention
- Database uniqueness constraints are enforced on both `email` and `phone`:
  - `userSchema.path('email').index({ unique: true })`
  - `userSchema.path('phone').index({ unique: true })`
- Normalized values prevent duplicates caused by formatting differences (e.g., spaces or hyphens in phone numbers, or casing in email addresses).

---

## 🛡️ Admin Panel & Activity Tracking System

DayLedger includes an enterprise-grade, secure Administrator Control Panel for monitoring registered users, inspecting account activity logs, and managing role permissions.

### Admin Access & Security Features
- **Strict Server-Side Authorization**: Every administrative API endpoint (`/api/admin/*`) is protected by `requireAuth` and `requireAdmin` middleware. If a non-admin user attempts access, the backend immediately responds with `403 Forbidden`. Hiding links in the UI is only for presentation; the backend strictly enforces the boundary.
- **Zero Secret Exposure**: Passwords, bcrypt hashes, salts, and JWT session tokens are projected out at the database level (`.select('-password')`). They are **never** returned in API responses, logs, UI views, or export files.
- **Self-Demotion Safeguard**: An active administrator cannot demote their own account to prevent administrative lockout.
- **Safe CSV & JSON Export**: Authorized administrators can download sanitized user directory dumps containing profile fields (`ID`, `Name`, `Email`, `Phone`, `Age`, `Date of Birth`, `Current Age`, `Role`, `Created At`), with zero passwords or credentials.

### Secure Administrator Provisioning

To prevent public sign-up vulnerabilities and avoid hardcoded default credentials, administrators can be provisioned in two secure ways:

#### Option A: Automatic Elevation via `server/.env`
Specify comma-separated trusted email addresses in `server/.env`:
```ini
ADMIN_EMAILS=admin@dayledger.app,iksanjh@gmail.com
```
When an account with this email address registers or signs in, the server automatically assigns and persists `role: 'admin'` in MongoDB.

#### Option B: Secure CLI Role Elevation Script
Promote any existing registered user in MongoDB using the dedicated provisioning script:
```powershell
# Promote user to administrator
node server/scripts/promote-admin.js admin@dayledger.app

# Demote user back to standard user
node server/scripts/promote-admin.js user@dayledger.app --demote
```
The script connects directly to MongoDB, updates `user.role`, and automatically records a server-confirmed `ROLE_CHANGED` security event in the `authactivities` collection.

---

## 📜 Server-Confirmed Activity Logging (`authactivities`)

Authentication and security events are written directly to MongoDB as the single source of truth:
- **`SIGNUP`**: Triggered upon successful account registration. Records user ID, email, name, phone, age, role, IP address, and client details.
- **`LOGIN`**: Recorded upon successful password authentication.
- **`LOGOUT`**: Recorded when a user explicitly clicks "Sign Out".
- **`SESSION_EXPIRED`**: Distinctly recorded when an expired or invalidated token is detected by the server, without misrepresenting it as an explicit logout.
- **`ROLE_CHANGED`**: Recorded when an administrator promotes or demotes an account role.

### Activity Data Retention & Indexing
The `AuthActivity` Mongoose model defines high-performance indexes:
```javascript
authActivitySchema.index({ timestamp: -1 });
authActivitySchema.index({ eventType: 1, timestamp: -1 });
authActivitySchema.index({ userEmail: 1, timestamp: -1 });
authActivitySchema.index({ userId: 1, timestamp: -1 });
```

---

## ⚙️ Environment Variables

Create or configure `server/.env` with the following variables:

```ini
# Port for Express API server
PORT=5000

# Connection string for local MongoDB database
MONGODB_URI=mongodb://localhost:27017/dayledger

# Secret key for JWT session tokens
JWT_SECRET=dayledger-secure-jwt-key-2026-prod

# Trusted administrator email list (comma-separated)
ADMIN_EMAILS=admin@dayledger.app,iksanjh@gmail.com
```

---

## 🖥️ Running the Application Locally

### 1. Ensure Local MongoDB is Active
Verify MongoDB is running on port 27017:
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 27017 }
```
If not running, start your Windows MongoDB service:
```powershell
net start MongoDB
```

### 2. Start the Backend API Server
```powershell
node server.js
```
The server will log:
```
🚀 DayLedger Backend Server is running on http://localhost:5000
📡 MongoDB Target: mongodb://localhost:27017/dayledger
✅ [MongoDB Connected] Host: localhost, Database: dayledger
```

### 3. Start the Frontend Development Server
In a separate terminal, run:
```powershell
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

---

## 🧭 Verifying in MongoDB Compass

1. Launch **MongoDB Compass**.
2. Connect to: `mongodb://localhost:27017`.
3. In **MongoDB Compass**, open database **`dayledger`**:
   - Collection **`users`**:
     - View registered users: `name`, `email`, `phone`, `age`, `dateOfBirth`, `role` (`'admin'` or `'user'`), `password` (bcrypt hash).
   - Collection **`authactivities`**:
     - View chronological security events: `eventType` (`SIGNUP`, `LOGIN`, `LOGOUT`, `ROLE_CHANGED`), `userEmail`, `userName`, `ipAddress`, `userAgent`, `details`, and `timestamp`.

