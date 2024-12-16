from machine import ADC, Pin
import time
import network
import urequests
import json

# Wi-Fi credentials and server endpoint
SSID = ''
PASSWORD = ''
SERVER_URL = ''

# Configure and activate Wi-Fi connection
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(SSID, PASSWORD)

# Try connecting to Wi-Fi for up to max_wait seconds
max_wait = 60
while max_wait > 0:
    if wlan.status() < 0 or wlan.status() >= 3:
        # Break if connection fails or succeeds
        break
    max_wait -= 1
    print('waiting for connection...')
    time.sleep(1)

# Check the final Wi-Fi status
if wlan.status() != 3:
    raise RuntimeError('WiFi connection failed')
else:
    print('connected')
    status = wlan.ifconfig()
    print('IP: ', status[0])

# Initialize ADC pins for soil and light sensors, and a digital pin for touch sensor
soil_sensor = ADC(Pin(26))
touch_sensor = Pin(3, Pin.IN)
light_sensor = ADC(Pin(28))

# Main loop: read sensor values, send them to the server, and repeat every second
while True:
    soil_value = soil_sensor.read_u16()    # Read soil moisture (ADC)
    light_value = light_sensor.read_u16()  # Read light intensity (ADC)
    touch_value = touch_sensor.value()     # Read digital touch sensor
    print('Soil Moisture Value:', soil_value)
    print('Touch:', touch_value)
    print('Light', light_value)
    
    # Convert readings to JSON before sending
    data = json.dumps({'soil': soil_value, 'touch': touch_value, 'light': light_value})
    
    # Send data via POST to the server
    response = urequests.post(SERVER_URL + '/sensors',
                              headers={'content-type': 'application/json'},
                              data=data)
    
    # Check if the server received the data successfully
    if response.status_code == 200:
        print('sent successfully')
    else:
        print(f'server error: {response.text}')
    
    response.close()
    time.sleep(1)