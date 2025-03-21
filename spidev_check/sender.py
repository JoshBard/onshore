#!/usr/bin/env python3
import spidev
import time

# ------------------------------------------------
# SX126x Common Commands (not exhaustive)
# ------------------------------------------------
CMD_SET_STANDBY             = 0x80
CMD_SET_RX                  = 0x82
CMD_SET_TX                  = 0x83
CMD_SET_SLEEP               = 0x84
CMD_SET_FS                  = 0xC1
CMD_WRITE_REGISTER          = 0x0D
CMD_READ_REGISTER           = 0x1D
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
CMD_SET_DIO2_AS_RF_SWITCH   = 0x9D  # Sometimes 0x9D or 0x94 depending on doc version

# ------------------------------------------------
# Packet Types
# ------------------------------------------------
PACKET_TYPE_GFSK = 0x00
PACKET_TYPE_LORA = 0x01

# ------------------------------------------------
# Standby Modes
# ------------------------------------------------
STDBY_RC = 0x00
STDBY_XOSC = 0x01  # typically use RC for low-power

# ------------------------------------------------
# Some Example LoRa Settings
# ------------------------------------------------
# Frequency in Hz
# For 915 MHz region, set e.g. 915000000
RF_FREQUENCY = 915000000

# LoRa Modulation Params
# Spreading factor (SF7)
# Bandwidth 125 kHz => param = 0x04
# Coding Rate 4/5 => param = 0x01
# Low Data Rate Optimize Off => param = 0x00
LORA_SF_7     = 0x07
LORA_BW_125   = 0x04  # see Semtech docs for enumerations
LORA_CR_4_5   = 0x01
LORA_LD_OFF   = 0x00

# Packet Params
# Preamble length = 8 symbols => 0x0008
# Explicit header (variable length) => 0x00
# Payload length = 0x10 (16 bytes)
# CRC on => 0x01
# IQ standard => 0x00
PREAMBLE_LEN = 8
PAYLOAD_LEN  = 16

# ------------------------------------------------
# SPI Helper
# ------------------------------------------------
spi = spidev.SpiDev()

def execute_cmd(cmd, tx_data=b"", read_len=0):
    """
    Sends an SX126x command byte (cmd) followed by optional tx_data bytes.
    If read_len > 0, reads that many bytes of response.
    """
    # Command phase
    spi.xfer2([cmd])
    # Data phase (write)
    if tx_data:
        spi.xfer2(list(tx_data))

    result = []
    # If we expect to read, we must clock out dummy bytes
    if read_len > 0:
        result = spi.xfer2([0x00]*read_len)
    return result

def set_standby(mode=STDBY_RC):
    """Put radio into STANDBY mode (RC or XOSC)."""
    execute_cmd(CMD_SET_STANDBY, bytes([mode]))

def set_packet_type_lora():
    """Set packet type to LoRa."""
    execute_cmd(CMD_SET_PACKET_TYPE, bytes([PACKET_TYPE_LORA]))

def set_rf_frequency(freq_hz):
    """
    freq_hz is the target frequency in Hz (e.g. 915e6).
    SX126x uses a 24-bit value: freq = (freq_hz / FreqSynthStep),
    where FreqSynthStep = 32e6 / 2^25 = 0.95367431640625 Hz
    """
    # Calculate 24-bit value
    freq_val = int((freq_hz / 32000000.0) * (1 << 25))
    buf = [
        (freq_val >> 24) & 0xFF,
        (freq_val >> 16) & 0xFF,
        (freq_val >>  8) & 0xFF,
        (freq_val >>  0) & 0xFF,
    ]
    execute_cmd(CMD_SET_RF_FREQUENCY, bytes(buf))

def set_modulation_params(sf, bw, cr, ldro):
    """
    For LoRa: [SF, BW, CR, LowDataRateOptimize].
    """
    execute_cmd(CMD_SET_MODULATION_PARAMS, bytes([sf, bw, cr, ldro]))

def set_packet_params(preamble_len, header_type, payload_len, crc_on, invert_iq):
    """
    For LoRa: [preambleLen(2 bytes), headerType, payloadLen, CRC, IQ].
    """
    # Preamble length is 2 bytes
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
    power: in dBm (range depends on board, e.g. -17 to +22).
    ramp_time: example 0x34 => 200 us, see datasheet for others.
    """
    # power is clamped internally, typical max is 22
    execute_cmd(CMD_SET_TX_PARAMS, bytes([power & 0x3F, ramp_time]))

def set_buffer_base(tx_base=0x00, rx_base=0x00):
    """Sets TX and RX FIFO base addresses in SX126x memory."""
    execute_cmd(CMD_SET_BUFFER_BASE_ADDRESS, bytes([tx_base, rx_base]))

def clear_irq():
    """Clear all IRQ status bits."""
    execute_cmd(CMD_CLEAR_IRQ_STATUS, b'\xFF\xFF')

def get_irq_status():
    """Reads current IRQ status (16 bits)."""
    result = execute_cmd(CMD_GET_IRQ_STATUS, read_len=3)
    # result is 3 bytes: status[0], irqMsb, irqLsb
    irq_msb = result[1]
    irq_lsb = result[2]
    return (irq_msb << 8) | ir
