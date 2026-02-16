# Faculty Guide: Raspberry Pi Hardware Integration

This document explains how the **Smart Attendance System** bridges the physical Raspberry Pi hardware with the Web/Mobile Dashboard.

## 1. System Architecture
We use a **Unified Backend Architecture** running on **Node.js (Port 4001)**. 
- **Reason**: By running both the Dashboard API and the Hardware Listener in a single process, we eliminate network lag and resolve port mismatch issues.

## 2. Raspberry Pi Data Flow
When a student scans their RFID card or passes face recognition on the Pi:

1. **Python Client**: The Raspberry Pi runs a Python script that captures the student's ID and timestamp.
2. **HTTP POST**: The Pi sends a request to the backend:
   `POST http://<SERVER_IP>:4001/api/attendance`
3. **CSV Logging**: The backend receives the data and uses the `fs.appendFile` method to record the entry in:
   `/home/eee/attendance_system/attendance.csv`
4. **Cloud Sync**: Simultaneously, the backend attempts to sync the record to **MongoDB Atlas** for long-term storage.

## 3. Real-time Dashboard Updates
The React Dashboard fetches this data via the `/api/attendance/csv` endpoint.
- **GET Request**: The frontend polls this endpoint every few seconds.
- **Processing**: The backend reads the CSV file, reverses the list (so the latest record is on top), and returns a clean JSON array to the dashboard.

## 4. Key Endpoints for Review
- **Hardware Entry**: `POST /api/attendance` (Logic found in `routes/attendance.js`)
- **CSV Data Feed**: `GET /api/attendance/csv` (Logic found in `routes/attendance.js`)
- **Health Check**: `GET /api/health`

---
*Prepared by Smart Attendance Development Team*
