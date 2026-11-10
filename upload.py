import argparse
import math
import os
import sys
from pathlib import Path

import serial
from dotenv import load_dotenv
from postgrest.exceptions import APIError
from serial.tools import list_ports
from supabase import create_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read numeric lines from an Arduino and insert them into Supabase."
    )
    parser.add_argument(
        "--port",
        help="Arduino serial port; auto-detects a USB serial port if omitted",
    )
    return parser.parse_args()


def find_serial_port() -> str | None:
    ports = list(list_ports.comports())
    usb_ports = [
        port
        for port in ports
        if any(
            marker in f"{port.device} {port.description}".lower()
            for marker in ("usb", "arduino", "ttyacm", "ttyusb")
        )
    ]

    if len(usb_ports) == 1:
        return usb_ports[0].device

    if len(usb_ports) > 1:
        print("Multiple USB serial ports found:")
        for index, port in enumerate(usb_ports, start=1):
            print(f"  {index}. {port.device} — {port.description}")
        try:
            selection = int(input("Select Arduino port number: "))
        except (ValueError, EOFError):
            return None
        if 1 <= selection <= len(usb_ports):
            return usb_ports[selection - 1].device
        return None

    return None


def main() -> int:
    args = parse_args()
    port = args.port or find_serial_port()
    if not port:
        print(
            "No USB serial port detected. Connect the Arduino or specify --port.",
            file=sys.stderr,
        )
        return 1

    load_dotenv(Path(__file__).with_name(".env"))

    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        print(
            "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.",
            file=sys.stderr,
        )
        return 1

    client = create_client(supabase_url, supabase_key)
    print(f"Connecting to {port} at 9600 baud. Press Ctrl+C to stop.")

    try:
        with serial.Serial(port, 9600, timeout=1) as arduino:
            while True:
                raw_line = arduino.readline()
                if not raw_line:
                    continue

                try:
                    line = raw_line.decode("utf-8").strip()
                except UnicodeDecodeError:
                    print("Skipped a line that was not valid UTF-8.", file=sys.stderr)
                    continue

                if not line:
                    continue

                try:
                    value = float(line)
                except ValueError:
                    print(f"Skipped non-numeric line: {line!r}", file=sys.stderr)
                    continue

                if not math.isfinite(value):
                    print(f"Skipped non-finite value: {line!r}", file=sys.stderr)
                    continue

                print(line, flush=True)
                reading = int(value) if value.is_integer() else value
                client.table("readings").insert({"value": reading}).execute()
    except KeyboardInterrupt:
        print("\nStopped.")
    except serial.SerialException as error:
        print(f"Serial port error: {error}", file=sys.stderr)
        return 1
    except APIError as error:
        print(f"Supabase insert failed: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
