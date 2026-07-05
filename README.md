# Road AI Monitor: Real-Time IoT Pothole & Surface Detection

An end-to-end IoT and Machine Learning system designed to evaluate road surface conditions in real-time. This project integrates custom hardware telemetry with an Ionic/Angular mobile application to map potholes, rough roads, and smooth surfaces using a live Google Maps interface.

## 🚀 Key Features

* **Real-Time Bluetooth Telemetry (BLE):** Interfaces with an ESP32 microcontroller and MPU6050 accelerometer to stream 3-axis vibration data to the mobile device at 10Hz.
* **Rolling-Window ML Classification:** Buffers raw sensor data into 1-second physical signature "windows" and streams them to a Python/Render backend for live Machine Learning classification.
* **Fault-Tolerant Kinematics:** Implements a dual-layer speed calculation system. It prioritizes the native GPS hardware sensor but features an automatic fallback that simulates velocity using the Haversine spherical distance formula if the hardware sensor fails.
* **Dynamic Geolocation Mapping:** Utilizes the Google Maps API to draw color-coded vector polylines (Green = Smooth, Red = Rough) and drops permanent coordinate markers (Purple Pins = Potholes) based on the AI's real-time output.

## 🛠️ Technology Stack

* **Frontend App:** Angular, Ionic Framework, TypeScript, HTML/SCSS
* **Hardware:** ESP32, MPU6050 (6-axis Accelerometer/Gyroscope), C++
* **Backend / AI:** Python, Scikit-learn / TensorFlow, Render (Cloud Hosting)
* **APIs & Plugins:** Google Maps JavaScript API, Capacitor Bluetooth LE, Capacitor Geolocation

## 🧠 System Architecture & Mathematical Logic

### 1. The Machine Learning Pipeline
The app acquires telemetry at 10Hz. Instead of processing single data points, the system buffers 10 sequential points into an array (representing exactly 1 second of driving). This window is transmitted via HTTP POST to the backend, which analyzes structural vibration intensity and returns a categorical label (`G`, `B`, or `P`).

### 2. Haversine Speed Fallback
To ensure data integrity during GPS signal drops, the system calculates the exact distance traveled over the curve of the Earth every second. 
The system calculates distance (d) in meters, and directly converts meters-per-second to km/h by multiplying the result by 3.6.

## 📱 Application UI

The user interface features a live dashboard displaying:
* Instantaneous X, Y, and Z-axis gravitational forces.
* Active GPS coordinates (Latitude/Longitude).
* Real-time vehicle speed (km/h).
* The current active AI classification (Smooth, Rough, Pothole).

## ⚙️ Installation & Setup

1. Clone this repository: `git clone https://github.com/YOUR_USERNAME/road-ai-monitor.git`
2. Install dependencies: `npm install`
3. Add your Google Maps API key to the `index.html` file.
4. Run the app in the browser (for UI testing) or sync to a physical device:
   ```bash
   ionic serve
   ionic build
   npx cap sync android
