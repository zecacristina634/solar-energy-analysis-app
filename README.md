# Solar Energy Analysis - GoSolar

GoSolar is a mobile application for monitoring and analyzing a residential photovoltaic (PV) system. It was developed as a Bachelor's thesis project.
 
The app can connect to a real hardware prototype (ESP32-based) or simulate solar production using a mathematical model, when no physical device is available.

## What the app does
 
- Displays real-time production data: current power, energy produced today, estimated savings, panel temperature and system status
- Connects to a physical prototype via a pairing code, or switches to simulated production data
- Keeps a production history (daily/weekly/monthly) with the option to generate and download PDF reports
- Shows charts and statistics: monthly production, production vs. consumption, savings evolution, and a weather-based forecast for up to 7 days
- Provides Shiftable Loads recommendations — suggests the best time to run flexible appliances (washing machine, dishwasher, EV charger, etc.) based on expected solar production
- Tracks the household's constant consumption (fridge, router, always-on devices) to calculate the surplus available for flexible loads
- Basic account management: registration, login, profile, disconnecting the PV system, account deletion

## Mathematical model (simulation mode)
 
When no prototype is connected, production is simulated based on:
 
- Solar constant
- Eccentricity factor (Earth–Sun distance correction)
- Solar declination and hour angle
- Zenith angle
- Cloud coverage adjustments
- Panel efficiency and performance ratio
- Temperature coefficient
  
Reference: [MDPI – Energies 8(7):7058](https://www.mdpi.com/1996-1073/8/7/7058)
 
## Hardware prototype
 
Real-data mode uses an ESP32 DEVKIT V1 board connected to:
 
- A 6V solar panel — the actual energy source for the prototype
- An INA219 sensor — reads voltage and current from the panel to calculate power output
- A DS18B20 sensor — reads panel temperature
- An OLED display — shows live readings directly on the device
Measurements are sent to the backend and linked to a user account via a pairing code.
