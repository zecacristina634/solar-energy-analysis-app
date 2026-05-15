#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_INA219.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "DIGI-W2Yd";
const char* WIFI_PASSWORD = "FRD2DJaN5Y";
const char* BACKEND_URL = "http://192.168.1.142:3000";

const float POWER_SCALE = 10000.0;
const float VOLTAGE_SCALE = 1333.0;

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDR 0x3C
#define ONE_WIRE_BUS 4 // pinul gpio al esp la care e conectat ds18b20

const unsigned long SEND_INTERVAL = 30000; // 30sec

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_INA219 ina219;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

bool oledOK = false;
bool inaOK = false;
bool dsOK = false;
bool wifiOK = false;
bool paired = false;

int systemId = -1;
String pairingCode = "";

float voltage_v = 0;
float current_a = 0;
float power_w = 0;
float temperature_c = 0;

unsigned long lastSendTime = 0;

String generatePairingCode() {
  const String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  String code = "";
  randomSeed(esp_random());
  for(int i =0; i < 6; i++){
    code += chars[random(0, chars.length())];
  }
  return code;
}

void readINA219Averaged(int samples = 5){
  float sumBus =0, sumShunt =0, sumCurrent=0, sumPower=0;
  for(int i=0; i < samples; i++){
    sumBus += ina219.getBusVoltage_V();
    sumShunt += ina219.getShuntVoltage_mV();
    sumCurrent += ina219.getCurrent_mA();
    sumPower += ina219.getPower_mW();
    delay(50);
  }
  float avgBusV = sumBus / samples;
  float avgShuntmV = sumShunt/ samples;

  voltage_v = avgBusV + (avgShuntmV/ 1000.0) * VOLTAGE_SCALE;
  power_w = abs((sumPower /samples) /1000.0) * POWER_SCALE;
  current_a = power_w/ voltage_v;
}

void readDS18B20() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);
  if (t== DEVICE_DISCONNECTED_C){
    dsOK = false;
  } else {
    temperature_c = t;
    dsOK =true;
  }
}

void connectWiFi() {
  if(oledOK){
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Conectare WiFi...");
    display.println(WIFI_SSID);
    display.display();
  }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectare WiFi");
  int attempts =0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40){
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if(WiFi.status() == WL_CONNECTED){
    wifiOK= true;
    Serial.println("\nWiFi conectat!");
    if (oledOK){
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("WiFi: OK");
      display.display();
      delay(2000);
    }
  } else {
    wifiOK = false;
    Serial.println("\nWiFi EROARE!");
    delay(3000);
    ESP.restart();
  }
}

bool sendPairingCode(String code) {
  if (!wifiOK) return false;
  HTTPClient http;
  http.begin(String(BACKEND_URL) + "/systems/pair/register");
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<200> doc;
  doc["code_value"] = code;
  String body;
  serializeJson(doc, body);
  int httpCode = http.POST(body);
  String response = http.getString();
  http.end();
  Serial.print("Pairing status: ");
  Serial.println(httpCode);
  Serial.println(response);
  return (httpCode == 200 || httpCode == 201);
}

bool checkIfPaired(String code) {
  if(!wifiOK) return false;
  HTTPClient http;
  http.begin(String(BACKEND_URL) + "/systems/pair/status/" + code);
  int httpCode = http.GET();
  String response = http.getString();
  http.end();
  if(httpCode == 200){
    StaticJsonDocument<200> doc;
    deserializeJson(doc, response);
    bool isUsed = doc["is_used"] | false;
    if(isUsed){
      systemId = doc["id_system"] | -1;
    }
    return isUsed;
  }
  return false;
}

bool sendMeasurement() {
  if(!wifiOK || systemId == -1) return false;
  HTTPClient http;
  http.begin(String(BACKEND_URL) + "/measurements");
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<256> doc;
  doc["id_system"] = systemId;
  doc["voltage_v"] = voltage_v;
  doc["current_a"] = current_a;
  doc["power_w"] = power_w;
  doc["temperature_c"] = temperature_c;
  String body;
  serializeJson(doc, body);
  int httpCode = http.POST(body);
  http.end();
  Serial.print("Measurement status: ");
  Serial.println(httpCode);
  return (httpCode == 201);
}

void drawPairingScreen() {
  if (!oledOK) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("GoSolar");
  display.println("Cod conectare:");
  display.println();
  display.setTextSize(2);
  display.setCursor(10, 30);
  display.println(pairingCode);
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.println("Asteapta...");
  display.display();
}

void drawLiveScreen(){
  if (!oledOK) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("GoSolar - Live");
  display.println("---------------");
  display.print("Temp: ");
  if (dsOK) { display.print(temperature_c, 1); display.println(" C"); }
  else display.println("ERR");
  display.print("Volt: "); display.print(voltage_v, 2); display.println(" V");
  display.print("Curr: "); display.print(current_a, 2); display.println(" A");
  display.print("Pow: "); display.print(power_w, 2); display.println(" W");
  display.print("WiFi: "); display.println(wifiOK ? "OK" : "ERR");
  display.display();
}

void printSerialData() {
  Serial.println("===== GoSolar ESP32 =====");
  Serial.print("System ID: "); Serial.println(systemId);
  Serial.print("Paired: ");    Serial.println(paired ? "DA" : "NU");
  Serial.print("WiFi: ");      Serial.println(wifiOK ? "OK" : "ERR");
  Serial.print("Temp: ");      Serial.print(temperature_c, 2); Serial.println(" C");
  Serial.print("Voltage: ");   Serial.print(voltage_v, 3);     Serial.println(" V");
  Serial.print("Current: ");   Serial.print(current_a, 2); Serial.println(" A");
  Serial.print("Power: ");     Serial.print(power_w, 2);   Serial.println(" W");
  Serial.println("=========================");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(21, 22); //pornire pinii 21 si 22 = sda si scl

  oledOK= display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (oledOK) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("GoSolar");
    display.println("Pornire...");
    display.display();
  }

  inaOK = ina219.begin();
  ds18b20.begin();
  dsOK = ds18b20.getDeviceCount() > 0;

  if (oledOK) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.print("OLED: ");    display.println("OK");
    display.print("INA219: ");  display.println(inaOK ? "OK" : "ERR");
    display.print("DS18B20: "); display.println(dsOK  ? "OK" : "ERR");
    display.display();
    delay(2000);
  }

  connectWiFi();

  pairingCode = generatePairingCode();
  Serial.print("Pairing code: ");
  Serial.println(pairingCode);
  sendPairingCode(pairingCode);
  drawPairingScreen();
}

void loop() {
  if(WiFi.status() != WL_CONNECTED){
    wifiOK = false;
    connectWiFi();
  }

  if(inaOK) readINA219Averaged(5);
  readDS18B20();

  if(!paired){
    paired = checkIfPaired(pairingCode);
    if(paired){
      Serial.println("Dispozitiv conectat!");
      if(oledOK){
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Conectat!");
        display.print("System ID: ");
        display.println(systemId);
        display.display();
        delay(2000);
      }
    } else{
      drawPairingScreen();
    }
  }

  if(paired){
    unsigned long now = millis();
    if(now - lastSendTime >= SEND_INTERVAL){
      lastSendTime = now;
      bool sent = sendMeasurement();
      Serial.println(sent ? "Date trimise!" : "Eroare trimitere date!");
    }
    drawLiveScreen();
  }

  printSerialData();
  delay(2000);
}
