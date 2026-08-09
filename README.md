# MediStock AI

> AI-powered medicine stock monitoring, shortage prediction, pharmacy inventory management, and patient medicine discovery platform.

Developed as part of **IEMHACKS 4.0 Hackathon**.

MediStock AI is designed to help pharmacies monitor medicine inventory, identify potential shortages, manage alerts, and help patients locate nearby pharmacies where required medicines may be available.

---

## 🔗 Project Links

### GitHub Repository
https://github.com/pratik-2412-git/medi-stock-ai

### Supabase Project
https://vhlmvntofqgyitdddpdn.supabase.co

---

## 🎯 Problem Statement

Medicine shortages can create serious difficulties for both pharmacies and patients.

Pharmacy owners need a way to:

- Monitor medicine inventory.
- Identify medicines approaching shortage.
- Track stock and reorder levels.
- Receive shortage alerts.
- Analyze medicine sales trends.
- Predict potential shortages.

Patients need a simple way to:

- Search for medicines.
- Find nearby pharmacies.
- Check medicine availability.
- Identify pharmacies with low-risk/in-stock medicines.
- View pharmacy locations on a map.
- Get directions and contact information.

MediStock AI brings these capabilities together in a single platform.

---

## 🚀 Key Features

### 👨‍⚕️ Patient Dashboard

Patients can:

- Sign up and log in using email authentication.
- Search for medicines.
- Get medicine autocomplete suggestions.
- Filter pharmacies by:
  - In-stock medicines
  - Low-risk medicines
  - Pincode/area
- Use their current location.
- Find pharmacies within the relevant search radius.
- View pharmacy stock status.
- View pharmacy distance.
- Call pharmacies.
- Get directions through Google Maps.
- View pharmacies on an interactive map.
- Request notification when an unavailable medicine becomes available.

---

### 🏥 Pharmacy Owner Dashboard

Pharmacy owners can:

- Register/login using Supabase Authentication.
- Complete pharmacy onboarding.
- View inventory.
- Add medicines to stock.
- Update stock quantities.
- Set reorder levels.
- View stock status.
- View medicine sales trends.
- Run shortage predictions.
- View shortage-risk information.
- Receive stock alerts.
- Mark alerts as read/dismiss alerts.
- Monitor medicines that are low or out of stock.

---

## 🤖 AI / Shortage Prediction

MediStock AI provides shortage-risk analysis based on medicine inventory and sales-related information.

The pharmacy dashboard can:

1. Monitor current medicine stock.
2. Compare stock against reorder levels.
3. Analyze medicine sales trends.
4. Run shortage prediction.
5. Store prediction results.
6. Generate alerts when shortage risk is detected.

Prediction results can be represented through shortage-risk categories such as:

- Safe
- Low
- Medium
- High
- Critical

---

## 🗺️ Medicine Search & Pharmacy Map

The patient dashboard supports location-based medicine discovery.

The system can:

- Detect the user's location through the browser Geolocation API.
- Search pharmacies based on medicine availability.
- Calculate distance between the user and pharmacies.
- Filter results by location.
- Display pharmacy results using cards.
- Display pharmacies on a Leaflet/OpenStreetMap-based map.
- Show stock status through map markers.
- Provide directions through Google Maps.

---

## 🔐 Authentication

MediStock AI uses **Supabase Authentication**.

Authentication is handled through Supabase Auth rather than manually creating users inside the authentication database.

The application supports role-based access for:

- Patient
- Pharmacy Owner

The user's profile is associated with the authenticated Supabase user and determines the appropriate dashboard.

### Authentication Flow

```text
User Signup
     ↓
Supabase Authentication
     ↓
Email Verification
     ↓
User Login
     ↓
Profile / Role Detection
     ↓
Role-based Dashboard
     ↓
Patient Dashboard
       OR
Pharmacy Owner Dashboard