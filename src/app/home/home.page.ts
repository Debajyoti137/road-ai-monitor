import { HttpClient } from '@angular/common/http';
import { Component, NgZone, OnInit } from '@angular/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Geolocation, Position } from '@capacitor/geolocation';

declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  deviceId: string = '';
  SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  isLogging = false;
  hasDemoRun = false;

  currentLat: number = 0;
  currentLng: number = 0;
  lastLat: number = 0;
  lastLng: number = 0;
  currentSpeed: number = 0.0;
  speedInterval: any;

  dataWindow: any[] = [];
  map: any;
  lastMappedLat: number = 0;
  lastMappedLng: number = 0;
  mapHistory: any[] = [];

  latestX: number = 0.0;
  latestY: number = 0.0;
  latestZ: number = 0.0;

  aiPredictionText: string = 'AWAITING DATA...';
  aiPredictionColor: string = '#8a8ab3';

  // --- Presentation Demo Coordinates ---
  demoSteps = [
    { type: 'line', color: '#00FF00', startLat: 22.574840, startLng: 88.433763, endLat: 22.575763, endLng: 88.434167 },
    { type: 'pin', lat: 22.575763, lng: 88.434167 },
    { type: 'line', color: '#FF0000', startLat: 22.575763, startLng: 88.434167, endLat: 22.576171, endLng: 88.434445 },
    { type: 'line', color: '#00FF00', startLat: 22.576171, startLng: 88.434445, endLat: 22.576819, endLng: 88.434785 },
    { type: 'line', color: '#00FF00', startLat: 22.576819, startLng: 88.434785, endLat: 22.577440, endLng: 88.435131 },
    { type: 'line', color: '#FF0000', startLat: 22.577440, startLng: 88.435131, endLat: 22.577707, endLng: 88.435280 },
    { type: 'line', color: '#00FF00', startLat: 22.577707, startLng: 88.435280, endLat: 22.579903, endLng: 88.436414 },
    { type: 'line', color: '#FF0000', startLat: 22.579903, startLng: 88.436414, endLat: 22.580979, endLng: 88.436981 },
    { type: 'pin', lat: 22.580261, lng: 88.436603 },
    { type: 'pin', lat: 22.580620, lng: 88.436792 }
  ];

  constructor(private ngZone: NgZone, private http: HttpClient) { }

  ngOnInit() { }

  ionViewDidEnter() {
    this.initMap();
  }

  initMap() {
    const mapElement = document.getElementById('map');

    if (mapElement) {
      const savedCenter = localStorage.getItem('lastMapCenter');
      let startLocation = { lat: 22.5726, lng: 88.3639 };
      let startZoom = 13;

      if (savedCenter) {
        startLocation = JSON.parse(savedCenter);
        startZoom = 16;
      }

      this.map = new google.maps.Map(mapElement, {
        center: startLocation,
        zoom: startZoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        clickableIcons: false
      });

      this.loadSavedMapData();

      google.maps.event.addListener(this.map, 'click', (event: any) => {
        const clickedLat = event.latLng.lat();
        const clickedLng = event.latLng.lng();
        console.log("Manual Pin Dropped at: ", clickedLat, clickedLng);

        new google.maps.Marker({
          position: { lat: clickedLat, lng: clickedLng },
          map: this.map,
          title: "Manual Coordinate Check",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        });

        alert(`📍 Coordinates Captured:\nLatitude: ${clickedLat.toFixed(6)}\nLongitude: ${clickedLng.toFixed(6)}`);
      });
    }
  }

  // --- Master Button Logic ---
  async masterStartButton() {
    if (!this.hasDemoRun) {
      // First click: Runs demo and SAVES it to memory
      await this.runPresentationDemo();
    } else {
      // Second click: Keeps the demo drawing on the map and turns on real hardware!
      await this.startSystem();
    }
  }

  // --- Dynamic Presentation Demo Function ---
  async runPresentationDemo() {
    if (!this.map) return;

    // We only clear memory here at the very start of the presentation
    this.clearMapMemory();
    this.isLogging = true;

    this.map.setCenter({ lat: 22.574840, lng: 88.433763 });
    this.map.setZoom(17);

    for (let i = 0; i < this.demoSteps.length; i++) {
      const step = this.demoSteps[i];

      if (step.type === 'line') {
        const lineColor = step.color;
        const numSegments = 4; // We slice the straight line into 4 segments to add realistic "wobble"

        let previousLat = step.startLat!;
        let previousLng = step.startLng!;

        for (let j = 1; j <= numSegments; j++) {
          let targetLat, targetLng;

          if (j === numSegments) {
            // The final micro-segment connects perfectly so there are no gaps
            targetLat = step.endLat!;
            targetLng = step.endLng!;
          } else {
            // Calculate intermediate points and add mathematical "GPS Drift" disturbances
            const fraction = j / numSegments;
            const exactLat = step.startLat! + (step.endLat! - step.startLat!) * fraction;
            const exactLng = step.startLng! + (step.endLng! - step.startLng!) * fraction;

            // Random offset makes the line look realistically jagged
            targetLat = exactLat + (Math.random() - 0.5) * 0.00008;
            targetLng = exactLng + (Math.random() - 0.5) * 0.00008;
          }

          const pathCoords = [
            { lat: previousLat, lng: previousLng },
            { lat: targetLat, lng: targetLng }
          ];

          this.ngZone.run(() => {
            this.currentLat = targetLat;
            this.currentLng = targetLng;

            if (lineColor === '#00FF00') {
              this.aiPredictionText = 'SMOOTH ROAD';
              this.aiPredictionColor = '#00e676';
              this.latestX = (Math.random() - 0.5);
              this.latestY = (Math.random() - 0.5);
              this.latestZ = 9.8 + (Math.random() * 0.5);
              this.currentSpeed = (25.0 + Math.random() * 10) / 3.6;
            } else {
              this.aiPredictionText = 'ROUGH ROAD DETECTED';
              this.aiPredictionColor = '#ff4d4d';
              this.latestX = (Math.random() - 0.5) * 4.0;
              this.latestY = (Math.random() - 0.5) * 4.0;
              this.latestZ = 12.5 + (Math.random() * 3.0);
              this.currentSpeed = (15.0 + Math.random() * 10) / 3.6;
            }

            new google.maps.Polyline({
              path: pathCoords,
              geodesic: true,
              strokeColor: lineColor,
              strokeOpacity: 1.0,
              strokeWeight: 6,
              map: this.map
            });

            // NEW: Save Demo Line to permanent map memory!
            this.mapHistory.push({ type: 'line', color: lineColor, path: pathCoords });
            localStorage.setItem('roadMapHistory', JSON.stringify(this.mapHistory));

            this.map.panTo({ lat: targetLat, lng: targetLng });
          });

          previousLat = targetLat;
          previousLng = targetLng;

          await this.delay(500); // Wait 500ms between drawing micro-segments so it animates nicely
        }

      } else if (step.type === 'pin') {
        this.ngZone.run(() => {
          this.currentLat = step.lat!;
          this.currentLng = step.lng!;

          this.aiPredictionText = '⚠️ POTHOLE DETECTED! ⚠️';
          this.aiPredictionColor = '#b366ff';
          this.latestX = (Math.random() - 0.5) * 8.0;
          this.latestY = (Math.random() - 0.5) * 8.0;
          this.latestZ = 18.5 + (Math.random() * 2.5);
          this.currentSpeed = (5.0 + Math.random() * 5) / 3.6;

          new google.maps.Marker({
            position: { lat: step.lat!, lng: step.lng! },
            map: this.map,
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" },
            title: "Pothole Detected!"
          });

          // NEW: Save Demo Pin to permanent map memory!
          this.mapHistory.push({ type: 'pin', lat: step.lat!, lng: step.lng! });
          localStorage.setItem('roadMapHistory', JSON.stringify(this.mapHistory));
        });

        await this.delay(1000); // Pause on pothole
      }
    }

    // Finish demo sequence
    setTimeout(() => {
      this.isLogging = false;
      this.hasDemoRun = true;
      this.aiPredictionText = 'AWAITING DATA...';
      this.aiPredictionColor = '#8a8ab3';
      this.currentSpeed = 0.0;
      this.latestX = 0.0;
      this.latestY = 0.0;
      this.latestZ = 0.0;

      // Reset last mapped coords so real hardware starts a fresh physical line
      this.lastMappedLat = 0;
      this.lastMappedLng = 0;
    }, 2000);
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  loadSavedMapData() {
    const savedHistory = localStorage.getItem('roadMapHistory');
    if (savedHistory && this.map) {
      this.mapHistory = JSON.parse(savedHistory);

      this.mapHistory.forEach(item => {
        if (item.type === 'line') {
          new google.maps.Polyline({
            path: item.path,
            geodesic: true,
            strokeColor: item.color,
            strokeOpacity: 1.0,
            strokeWeight: 6,
            map: this.map
          });
        } else if (item.type === 'pin') {
          new google.maps.Marker({
            position: { lat: item.lat, lng: item.lng },
            map: this.map,
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png"
            },
            title: "Saved Pothole!"
          });
        }
      });
    }
  }

  clearMapMemory() {
    localStorage.removeItem('roadMapHistory');
    this.mapHistory = [];
    if (this.map) {
      this.initMap();
    }
  }

  async startSystem() {
    this.isLogging = true;
    this.dataWindow = [];

    this.aiPredictionText = 'AWAITING DATA...';
    this.aiPredictionColor = '#8a8ab3';

    try {
      await Geolocation.requestPermissions();
      await BleClient.initialize();

      await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
        if (position) {
          this.currentLat = position.coords.latitude;
          this.currentLng = position.coords.longitude;

          if (position.coords.speed !== null && position.coords.speed >= 0) {
            this.currentSpeed = position.coords.speed;
          }
        }
      });

      const device = await BleClient.requestDevice({ services: [this.SERVICE_UUID] });
      this.deviceId = device.deviceId;
      await BleClient.connect(this.deviceId);

      await BleClient.startNotifications(this.deviceId, this.SERVICE_UUID, this.CHAR_UUID, (value) => {
        this.handleIncomingSensorData(value);
      });

      this.speedInterval = setInterval(() => {
        this.calculateAndSendSpeed();
      }, 1000);

    } catch (error) {
      console.error("System failed to start.", error);
      this.isLogging = false;
    }
  }

  handleIncomingSensorData(value: DataView) {
    const dataString = new TextDecoder().decode(value.buffer).trim();
    const [ax, ay, az] = dataString.split(',');

    const dataPoint = {
      x: parseFloat(ax),
      y: parseFloat(ay),
      z: parseFloat(az),
      lat: this.currentLat,
      lng: this.currentLng,
      timestamp: Date.now()
    };

    this.ngZone.run(() => {
      this.latestX = dataPoint.x;
      this.latestY = dataPoint.y;
      this.latestZ = dataPoint.z;

      this.dataWindow.push(dataPoint);

      if (this.dataWindow.length >= 10) {
        this.processMLWindow(this.dataWindow);
        this.dataWindow = [];
      }
    });
  }

  processMLWindow(window: any[]) {
    const serverUrl = 'https://road-monitor-ai.onrender.com/predict';

    const payload = {
      window: window,
      speed: this.currentSpeed
    };

    this.http.post(serverUrl, payload).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          const prediction = response.label;

          this.ngZone.run(() => {
            if (prediction === 'G') {
              this.aiPredictionText = 'SMOOTH ROAD';
              this.aiPredictionColor = '#00e676';
            } else if (prediction === 'B') {
              this.aiPredictionText = 'ROUGH ROAD DETECTED';
              this.aiPredictionColor = '#ff4d4d';
            } else if (prediction === 'P') {
              this.aiPredictionText = '⚠️ POTHOLE DETECTED! ⚠️';
              this.aiPredictionColor = '#b366ff';
            }
          });

          let exactPotholeLat = window[5].lat;
          let exactPotholeLng = window[5].lng;

          this.drawOnMap(prediction, exactPotholeLat, exactPotholeLng);
        }
      },
      error: (err) => {
        console.error('Server connection failed.', err);
      }
    });
  }

  drawOnMap(label: string, exactLat: number, exactLng: number) {
    if (!this.map) return;

    const currentPos = { lat: this.currentLat, lng: this.currentLng };
    this.map.setCenter(currentPos);
    localStorage.setItem('lastMapCenter', JSON.stringify(currentPos));

    if (!this.lastMappedLat || !this.lastMappedLng) {
      this.lastMappedLat = this.currentLat;
      this.lastMappedLng = this.currentLng;
      return;
    }

    if (label === 'G' || label === 'B') {
      const lineColor = label === 'G' ? '#00FF00' : '#FF0000';

      const pathCoordinates = [
        { lat: this.lastMappedLat, lng: this.lastMappedLng },
        { lat: this.currentLat, lng: this.currentLng }
      ];

      const roadSegment = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: lineColor,
        strokeOpacity: 1.0,
        strokeWeight: 6
      });

      roadSegment.setMap(this.map);

      this.mapHistory.push({ type: 'line', color: lineColor, path: pathCoordinates });
      localStorage.setItem('roadMapHistory', JSON.stringify(this.mapHistory));

    } else if (label === 'P') {
      new google.maps.Marker({
        position: { lat: exactLat, lng: exactLng },
        map: this.map,
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" },
        title: "Pothole Detected!"
      });

      this.mapHistory.push({ type: 'pin', lat: exactLat, lng: exactLng });
      localStorage.setItem('roadMapHistory', JSON.stringify(this.mapHistory));
    }

    this.lastMappedLat = this.currentLat;
    this.lastMappedLng = this.currentLng;
  }

  async calculateAndSendSpeed() {
    let speedKmh = 0;

    if (this.currentSpeed > 0) {
      speedKmh = this.currentSpeed * 3.6;
    } else if (this.lastLat !== 0 && this.lastLng !== 0) {
      const distanceMeters = this.getDistanceFromLatLonInM(this.lastLat, this.lastLng, this.currentLat, this.currentLng);
      this.currentSpeed = distanceMeters;
      speedKmh = distanceMeters * 3.6;
    }

    const speedCommand = `S,${speedKmh.toFixed(1)}\n`;

    try {
      const buffer = new TextEncoder().encode(speedCommand);
      await BleClient.write(this.deviceId, this.SERVICE_UUID, this.CHAR_UUID, new DataView(buffer.buffer));
    } catch (e) {
      console.error("Failed to send speed", e);
    }

    this.lastLat = this.currentLat;
    this.lastLng = this.currentLng;
  }

  getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  async stopSystem() {
    this.isLogging = false;
    this.aiPredictionText = 'SYSTEM OFFLINE';
    this.aiPredictionColor = '#8a8ab3';
    clearInterval(this.speedInterval);
    if (this.deviceId) {
      await BleClient.disconnect(this.deviceId);
    }
  }
}