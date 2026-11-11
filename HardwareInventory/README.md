# SmartLab Guardian — Hardware Inventory

Full-stack Hardware Inventory module for the SmartLab Guardian project.

## Stack
- Backend: Node.js, Express, MongoDB, Mongoose
- Frontend: React + Vite
- Features: create, list, search/filter, edit, view details, delete hardware; status tracking.

## Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas connection string

## 1. Backend setup
From the repository root, open a terminal:
```bash
cd HardwareInventory/backend
copy .env.example .env
# Edit .env and set MONGO_URI
npm install
npm run dev
```
Backend runs at `http://localhost:5000`.

The backend exits with a clear setup message if `MONGO_URI` is missing. MongoDB must be running or reachable before the API starts.

## 2. Frontend setup
Open a second terminal from the repository root:
```bash
cd HardwareInventory/frontend
npm install
npm run dev
```
Open the URL Vite prints, normally `http://localhost:5173`.

The inventory dashboard supports adding, editing, viewing, searching, filtering, and deleting hardware. Use the status and category filters together, or refresh the register to reload the latest data.

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/hardware` | List hardware; optional `?search=...&status=Working` |
| GET | `/api/hardware/:id` | Get one record |
| POST | `/api/hardware` | Create record |
| PUT | `/api/hardware/:id` | Update record |
| DELETE | `/api/hardware/:id` | Delete record |
| GET | `/api/health` | Check API status |

## Example POST body
```json
{
  "hardware_id": "PC001",
  "hardware_name": "Lab Computer 01",
  "category": "Computer",
  "brand": "Dell",
  "model": "OptiPlex",
  "processor": "Intel Core i5",
  "ram": "8GB",
  "storage": "512GB SSD",
  "status": "Working",
  "location": "Computer Lab 01",
  "notes": "Assigned to row A"
}
```

## Notes for team integration
The backend mounts the module at `/api/hardware`. If the shared team already has `server.js`, merge the route registration and middleware rather than replacing the shared server. Keep `.env` private and never commit it.
