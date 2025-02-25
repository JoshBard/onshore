import sys
import meshtastic
import meshtastic.spi

def send_meshtastic_message(command):
    """ Sends a Meshtastic message via SPI """
    try:
        interface = meshtastic.spi.SPIInterface(spiBus=0, spiCS=0)  # Uses /dev/spidev0.0
        interface.sendText(command)
        print(f"Sent via Meshtastic (SPI): {command}")
        interface.close()
    except Exception as e:
        print(f"Error sending Meshtastic message: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        send_meshtastic_message(command)
    else:
        print("No command provided")
