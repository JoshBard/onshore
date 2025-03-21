#!/usr/bin/env python3
import spidev
import time

# ------------------------------------------------
# SX126x Commands & Constants (Simplified)
# ------------------------------------------------
CMD_SET_STANDBY             = 0x80
CMD_SET_RX                  = 0x82
CMD_SET_TX                  = 0x83
CMD_SET_SLEEP               = 0x84
CMD_WRITE_BUFFER            = 0x0E
CMD_READ_BUFFER             = 0x1E
CMD_SET_DIO_IRQ_PARAMS      = 0x08
CMD_GET_IRQ_STATUS          = 0x12
CMD_CLEAR_IRQ_STATUS        = 0x02
CMD_SET_RF_FREQUENCY        = 0x86
CMD_SET_PACKET_TYPE         = 0x8A
CMD_SET_MODULATION_PARAMS   = 0x8B
CMD_SET_PACKET_PARAMS       = 0x8C
CMD_SET_TX_PARAMS           = 0x8E
CMD_SET_BUFFER_BASE_ADDRESS = 0x8F
CMD_SET_DIO2_AS_RF_SWITCH   = 0x9D

PACKET_TYPE_LORA = 0x01
STDBY_RC = 0x00  # Standby with RC oscillator (low-power)

# Example frequency: 915 MHz (adjust for your region)
RF_FREQUENCY = 915000000

# Example LoRa modulation params
LORA_SF_7   = 0x07
LORA_BW_125 = 0x04  # see SX1262 doc for enumerations
LORA_CR_4_5 = 0x01
LORA_LD_OFF = 0x00  # low-data-rate optimization off

# Example LoRa packet params
PREAMBLE_LEN = 8    # 8-symbol preamble
HEADER_TYPE  = 0x00 # explicit header
PAYLOAD_LEN  = 16   # example fixed payload size
CRC_ON       = 0x01
IQ_STANDARD  = 0x00

spi = spidev.SpiDev()

def execute_cmd(cmd, tx_data=b"", read_len=0):
    """
    Sends an SX1262 command byte, then optional tx_data.
    If read_len > 0, reads that many response bytes afterward.
    """
    # Send command
    spi.xfer2([cmd])
    # Send any command parameters/data
    if tx_data:
        spi.xfer2(list(tx_data))

    # Read back if needed
    result = []
    if read_len > 0:
        result = spi.xfer2([0] * read_len)
    return result

def set_standby(mode=STDBY_RC):
    execute_cmd(CMD_SET_STANDBY, bytes([mode]))

def set_packet_type_lora():
    execute_cmd(CMD_SET_PACKET_TYPE, bytes([PACKET_TYPE_LORA]))

def set_rf_frequency(freq_hz):
    """
    freqVal = (freq_hz * 2^25) / 32e6
    """
    freq_val = int((freq_hz / 32000000.0) * (1 << 25))
    buf = [
        (freq_val >> 24) & 0xFF,
        (freq_val >> 16) & 0xFF,
        (freq_val >>  8) & 0xFF,
        (freq_val >>  0) & 0xFF
    ]
    execute_cmd(CMD_SET_RF_FREQUENCY, bytes(buf))

def set_modulation_params(sf, bw, cr, ldro):
    """
    LoRa: [SpreadFactor, Bandwidth, CodeRate, LowDataRateOptimize]
    """
    execute_cmd(CMD_SET_MODULATION_PARAMS, bytes([sf, bw, cr, ldro]))

def set_packet_params(preamble_len, header_type, payload_len, crc_on, invert_iq):
    """
    LoRa: [preambleLen(2 bytes), headerType, payloadLen, CRC, IQ]
    """
    buf = [
        (preamble_len >> 8) & 0xFF,
        (preamble_len >> 0) & 0xFF,
        header_type,
        payload_len,
        crc_on,
        invert_iq
    ]
    execute_cmd(CMD_SET_PACKET_PARAMS, bytes(buf))

def set_tx_params(power, ramp_time=0x34):
    """
    power typically from -17 up to +22 dBm depending on board.
    ramp_time=0x34 => 200 µs
    """
    execute_cmd(CMD_SET_TX_PARAMS, bytes([power & 0x3F, ramp_time]))

def set_buffer_base(tx_base=0x00, rx_base=0x00):
    execute_cmd(CMD_SET_BUFFER_BASE_ADDRESS, bytes([tx_base, rx_base]))

def set_dio2_as_rf_switch(enable=True):
    val = 0x01 if enable else 0x00
    execute_cmd(CMD_SET_DIO2_AS_RF_SWITCH, bytes([val]))

def clear_irq():
    # Pass two bytes 0xFF to clear all IRQ bits
    execute_cmd(CMD_CLEAR_IRQ_STATUS, b'\xFF\xFF')

def get_irq_status():
    result = execute_cmd(CMD_GET_IRQ_STATUS, read_len=3)
    # result[0] = status, [1]=IRQ_MSB, [2]=IRQ_LSB
    irq_msb = result[1]
    irq_lsb = result[2]
    return (irq_msb << 8) | irq_lsb

def write_buffer(offset, data_bytes):
    execute_cmd(CMD_WRITE_BUFFER, bytes([offset]) + data_bytes)

def read_buffer(offset, length):
    return execute_cmd(CMD_READ_BUFFER, bytes([offset, 0x00]), read_len=length)

def lora_init_tx():
    set_standby(STDBY_RC)
    time.sleep(0.01)

    set_dio2_as_rf_switch(True)
    set_packet_type_lora()
    set_rf_frequency(RF_FREQUENCY)
    set_modulation_params(LORA_SF_7, LORA_BW_125, LORA_CR_4_5, LORA_LD_OFF)
    set_packet_params(PREAMBLE_LEN, HEADER_TYPE, PAYLOAD_LEN, CRC_ON, IQ_STANDARD)
    set_tx_params(14, 0x34)  # 14 dBm, 200us ramp
    set_buffer_base(0x00, 0x00)
    clear_irq()

def send_packet(payload):
    """
    Writes payload to buffer (offset=0), calls SetTx with a timeout,
    and polls for TxDone.
    """
    if len(payload) > PAYLOAD_LEN:
        print("Warning: payload length exceeds configured payload size.")

    write_buffer(0, payload)
    clear_irq()

    # Timeout in 15.625 µs steps. e.g., ~3s => 3 / 15.625e-6 = 192000
    timeout_val = 192000
    buf = [
        (timeout_val >> 16) & 0xFF,
        (timeout_val >>  8) & 0xFF,
        (timeout_val >>  0) & 0xFF
    ]
    execute_cmd(CMD_SET_TX, bytes(buf))

    # Poll for TxDone (bit 0)
    timeout = time.time() + 5  # 5 second timeout
    while time.time() < timeout:
        irq = get_irq_status()
        if irq & 0x0001:  # TxDone
            print("TX Done!")
            clear_irq()
            return
        time.sleep(0.01)

    print("TX timed out. No TxDone IRQ received.")


def main():
    # Open spidev0.0
    spi.open(0, 0)
    spi.max_speed_hz = 2000000  # 2 MHz as an example

    lora_init_tx()
    print("SX1262 LoRa TX initialized on spidev0.0")

    counter = 0
    while True:
        message = f"Hello SX1262 #{counter}"
        print(f"Sending: {message}")
        send_packet(message.encode('utf-8'))
        counter += 1
        time.sleep(2)

if __name__ == "__main__":
    main()
