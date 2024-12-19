from machine import ADC, Pin
import time
import network
import urequests
import json

# Wi-Fi credentials and server endpoint
SSID = 'Galaxy S9'
PASSWORD = 'salam123'
SERVER_URL = 'http://192.168.146.122:8080'

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

def normalize(value):
    normalized_value = (value / 65535) * 100
    return round(normalized_value)

# Thresholds
SOIL_WET = 50
SOIL_DRY = 90
LIGHT_DARK = 30
LIGHT_BRIGHT = 50

# Determine the light state (1 = dark, 2 = normal, 3 = bright)
def determine_light_state(light_value):
    if light_value < LIGHT_DARK:
        return 1
    elif LIGHT_DARK <= light_value < LIGHT_BRIGHT:
        return 2
    else:
        return 3
    
# Determine the soil state (1 = dry, 2 = Normal, 3 = wet)
def determine_soil_state(soil_value):
    if soil_value < SOIL_WET:
        return 1
    else:
        return 2
    # elif SOIL_WET <= soil_value < SOIL_DRY:
    #     return 2
    # else:
        return 3

last_light_state = 0 
last_soil_state = 0
last_touch = 0

light_value_history = []
soil_value_history = []

# Main loop: read sensor values, send them to the server, and repeat every second
while True:
    soil_value = 100-normalize(soil_sensor.read_u16())    # Read soil moisture (ADC)
    light_value = normalize(light_sensor.read_u16())  # Read light intensity (ADC)
    touch_value = touch_sensor.value()     # Read digital touch sensor
    print('Soil Moisture Value:', soil_value)
    print('Touch:', touch_value)
    print('Light', light_value)

    light_state = determine_light_state(light_value)
    soil_state = determine_soil_state(soil_value)

    last_soil_state = soil_state if last_soil_state is 0 else last_soil_state
    last_light_state = light_state if last_light_state is 0 else last_light_state
    
    
    # Send data via POST to the server
    
    if((touch_value == 1 and last_touch == 0) or light_state != last_light_state or soil_state != last_soil_state):
        light_diff = 0
        soil_diff = 0

        if light_state != last_light_state:
            light_history_avg = sum(light_value_history) / len(light_value_history) if light_value_history else 0
            light_diff = light_value - light_history_avg

        # Handle soil state change
        if soil_state != last_soil_state:
            soil_history_avg = sum(soil_value_history) / len(soil_value_history) if soil_value_history else 0
            soil_diff = soil_value - soil_history_avg

        print("soil state", last_light_state, "->", light_state, ", diff: light: ", light_diff)
        print("light state", last_soil_state, '->', soil_state, ", diff: ", soil_diff)
        
        # Convert readings to JSON before sending
        data = json.dumps({'soil': soil_value, 'touch': touch_value, 'light': light_value, 'soil_diff': soil_diff, 'light_diff': light_diff})

        response = urequests.post(SERVER_URL + '/sensors',
                                headers={'content-type': 'application/json'},
                                data=data)
        
        # Check if the server received the data successfully
        if response.status_code == 200:
            print('sent successfully')
        else:
            print(f'server error: {response.text}')
        
        response.close()

        light_value_history = []
        soil_value_history = []

    light_value_history.append(light_value)
    soil_value_history.append(soil_value)

    last_light_state = light_state
    last_soil_state = soil_state
    last_touch = touch_value

    time.sleep(1)
