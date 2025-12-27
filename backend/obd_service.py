# Import compatibility shim first
import compat

import obd
import platform
import serial.tools.list_ports
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class OBDService:
    def __init__(self):
        self.connection: Optional[obd.OBD] = None
        self.port: Optional[str] = None

    def _find_obd_port(self) -> Optional[str]:
        """Auto-detect OBD port on Windows or macOS."""
        system = platform.system()
        
        if system == "Windows":
            # Scan COM ports
            ports = serial.tools.list_ports.comports()
            for port in ports:
                # Common OBD device identifiers
                if any(keyword in port.description.lower() for keyword in 
                       ['obd', 'elm327', 'obdlink', 'serial', 'usb']):
                    return port.device
            # Fallback: try common COM ports
            for port in ports:
                if port.device.startswith('COM'):
                    return port.device
        elif system == "Darwin":  # macOS
            # Scan /dev/tty.* ports
            import glob
            ports = glob.glob('/dev/tty.*')
            for port in ports:
                if 'usb' in port.lower() or 'serial' in port.lower():
                    return port
        
        return None

    def connect(self, port: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """Connect to OBD device. Returns (success, port_used)."""
        try:
            if self.connection and self.connection.is_connected():
                self.connection.close()
            
            if port is None:
                port = self._find_obd_port()
            
            if port is None:
                logger.warning("No OBD port found")
                return False, None
            
            # Try to connect with timeout
            self.connection = obd.OBD(port, timeout=5)
            
            if self.connection.is_connected():
                self.port = port
                logger.info(f"Connected to OBD device on {port}")
                return True, port
            else:
                logger.warning(f"Failed to connect to {port}")
                return False, None
                
        except Exception as e:
            logger.error(f"Error connecting to OBD: {e}")
            return False, None

    def disconnect(self):
        """Disconnect from OBD device."""
        if self.connection:
            try:
                self.connection.close()
            except:
                pass
            self.connection = None
            self.port = None

    def is_connected(self) -> bool:
        """Check if connected to OBD device."""
        if self.connection is None:
            return False
        try:
            return self.connection.is_connected()
        except:
            return False

    def get_live_data(self) -> dict:
        """Get live data from OBD. Returns safe values (N/A if unavailable)."""
        if not self.is_connected():
            return {
                "rpm": "N/A",
                "speed": "N/A",
                "coolant_temp": "N/A",
                "intake_temp": "N/A",
                "throttle_pos": "N/A",
            }
        
        data = {}
        
        try:
            # RPM
            cmd = obd.commands.RPM
            response = self.connection.query(cmd)
            data["rpm"] = str(response.value.magnitude) if response.value else "N/A"
        except:
            data["rpm"] = "N/A"
        
        try:
            # Speed
            cmd = obd.commands.SPEED
            response = self.connection.query(cmd)
            data["speed"] = str(response.value.magnitude) if response.value else "N/A"
        except:
            data["speed"] = "N/A"
        
        try:
            # Coolant temperature
            cmd = obd.commands.COOLANT_TEMP
            response = self.connection.query(cmd)
            data["coolant_temp"] = str(response.value.magnitude) if response.value else "N/A"
        except:
            data["coolant_temp"] = "N/A"
        
        try:
            # Intake temperature
            cmd = obd.commands.INTAKE_TEMP
            response = self.connection.query(cmd)
            data["intake_temp"] = str(response.value.magnitude) if response.value else "N/A"
        except:
            data["intake_temp"] = "N/A"
        
        try:
            # Throttle position
            cmd = obd.commands.THROTTLE_POS
            response = self.connection.query(cmd)
            data["throttle_pos"] = str(response.value.magnitude) if response.value else "N/A"
        except:
            data["throttle_pos"] = "N/A"
        
        return data

    def get_trouble_codes(self) -> dict:
        """Get stored and pending trouble codes from OBD2 scanner."""
        if not self.is_connected():
            return {"stored": [], "pending": []}
        
        stored = []
        pending = []
        
        try:
            # Get stored DTCs (Mode 03 - Stored Trouble Codes)
            cmd = obd.commands.GET_DTC
            response = self.connection.query(cmd)
            if response and response.value:
                for code in response.value:
                    if isinstance(code, (list, tuple)) and len(code) > 0:
                        code_str = str(code[0]).strip()
                        description = str(code[1]).strip() if len(code) > 1 and code[1] else "No description available"
                        stored.append({
                            "code": code_str,
                            "description": description
                        })
                    elif isinstance(code, str):
                        # Handle case where code is just a string
                        stored.append({
                            "code": code.strip(),
                            "description": "No description available"
                        })
            logger.info(f"Retrieved {len(stored)} stored DTCs from OBD2 scanner")
        except Exception as e:
            logger.error(f"Error getting stored codes: {e}")
        
        try:
            # Get pending DTCs (Mode 07 - Pending Trouble Codes)
            # python-obd may use different command names, try multiple approaches
            pending_cmds = []
            
            # Try common pending DTC command names
            if hasattr(obd.commands, 'GET_PENDING_DTC'):
                pending_cmds.append(obd.commands.GET_PENDING_DTC)
            if hasattr(obd.commands, 'PENDING_TROUBLE_CODES'):
                pending_cmds.append(obd.commands.PENDING_TROUBLE_CODES)
            if hasattr(obd.commands, 'MODE_07'):
                pending_cmds.append(obd.commands.MODE_07)
            
            # Try each available command
            for pending_cmd in pending_cmds:
                try:
                    response = self.connection.query(pending_cmd)
                    if response and response.value:
                        codes_list = response.value
                        # Handle different response formats
                        if isinstance(codes_list, list):
                            for code in codes_list:
                                if isinstance(code, (list, tuple)) and len(code) > 0:
                                    code_str = str(code[0]).strip()
                                    description = str(code[1]).strip() if len(code) > 1 and code[1] else "No description available"
                                    # Avoid duplicates
                                    if not any(p["code"] == code_str for p in pending):
                                        pending.append({
                                            "code": code_str,
                                            "description": description
                                        })
                                elif isinstance(code, str):
                                    code_str = code.strip()
                                    if code_str and not any(p["code"] == code_str for p in pending):
                                        pending.append({
                                            "code": code_str,
                                            "description": "No description available"
                                        })
                        break  # Successfully got pending codes, no need to try other commands
                except Exception as cmd_error:
                    logger.debug(f"Pending code command {pending_cmd} failed: {cmd_error}")
                    continue
            
            if len(pending) > 0:
                logger.info(f"Retrieved {len(pending)} pending DTCs from OBD2 scanner")
            else:
                logger.debug("No pending DTCs found or pending codes not supported by this vehicle/adapter")
        except Exception as e:
            logger.warning(f"Pending codes query failed: {e}")
            # Pending codes are optional - not all vehicles/adapters support them
        
        logger.info(f"Total: {len(stored)} stored codes, {len(pending)} pending codes from OBD2 scanner")
        return {"stored": stored, "pending": pending}

    def clear_codes(self) -> bool:
        """Clear trouble codes."""
        if not self.is_connected():
            return False
        
        try:
            cmd = obd.commands.CLEAR_DTC
            response = self.connection.query(cmd)
            return True
        except Exception as e:
            logger.error(f"Error clearing codes: {e}")
            return False

    def get_vehicle_info(self) -> dict:
        """Get vehicle information (VIN, make, model, year)."""
        if not self.is_connected():
            return {"vin": None, "make": None, "model": None, "year": None}
        
        info = {"vin": None, "make": None, "model": None, "year": None}
        
        try:
            # VIN
            cmd = obd.commands.VIN
            response = self.connection.query(cmd)
            if response.value:
                info["vin"] = str(response.value)
        except:
            pass
        
        # Note: Make/model/year may require additional OBD services
        # This is a basic implementation - may need enhancement based on actual OBD device capabilities
        
        return info

