# Flowey

---

## Prerequisites

1. A Raspberry Pi with MicroPython or Raspberry Pi Pico setup.
2. Node.js installed on the server machine.
3. OpenAI API key (for any OpenAI API interactions, if applicable).
4. A 2.4GHz Wi-Fi network (required for the Raspberry Pi connection).

---

## Setup Instructions

### 1. Configure the Server

1. **Clone the Repository**
   ```
   git clone https://github.com/SirCollypso/flowey.git
   cd flowey/server
   ```

2. **Set Up the Environment**
   - Create a `.env` file in the `server` directory.
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your-api-key-here
     ```

3. **Install Dependencies**
   Run the following command to install necessary dependencies:
   ```
   npm install
   ```

4. **Run the Server**
   Start the server with:
   ```
   node index.js
   ```

5. **Network Configuration**
   - Ensure the server machine is connected to the same 2.4GHz network as the Raspberry Pi.
   - Open port `8080` in the server machine’s firewall.

---

### 2. Configure the Raspberry Pi

1. **Edit `main.py`**
   - Navigate to the `rpi` directory and edit the `main.py` file.
   - Set the following variables:
     ```python
     SSID = "Your-2.4GHz-Network-SSID"
     PASSWORD = "Your-Network-Password"
     SERVER_URL = "http://<server-ip>:8080"
     ```
   - Replace `<server-ip>` with the local IP address of your server.

2. **Upload to Raspberry Pi**
   - Use the **MicroPython** plugin or **Raspberry Pi Pico** extension to upload `main.py` to your Raspberry Pi.
   - Alternatively, you can manually copy `main.py` to the Raspberry Pi.

3. **Run the Script**
   - Run the script directly through the MicroPython extension or ensure `main.py` runs at boot on your Raspberry Pi.

---

## Summary of Steps

1. Clone the repository.
2. Configure `.env` in the server directory with your OpenAI API key.
3. Ensure the Raspberry Pi is connected to a 2.4GHz network.
4. Open port 8080 in the server firewall and connect the server to the same network.
5. Set `SSID`, `PASSWORD`, and `SERVER_URL` in `main.py`.
6. Run `npm install` in the `server` directory and start the server with `node index.js`.
7. Upload or run `main.py` on the Raspberry Pi.

---

## Troubleshooting

- **Connection Issues**:
  - Double-check that the Raspberry Pi and server are on the same 2.4GHz network.
  - Verify the correct IP address is set in `main.py` for the `SERVER_URL`.

- **Firewall Problems**:
  - Ensure port `8080` is open on the server machine.
