#!/bin/bash
# Mission Control Firewall Setup
# Home/Workstation Balanced profile

echo "Installing ufw firewall..."
sudo apt install -y ufw

echo "Configuring default policies..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

echo "Allowing Mission Control from LAN..."
sudo ufw allow from 192.168.0.0/16 to any port 3001 proto tcp comment 'Mission Control API'
sudo ufw allow from 192.168.0.0/16 to any port 5173 proto tcp comment 'Mission Control UI'

echo "Enabling firewall..."
sudo ufw --force enable

echo "Verifying configuration..."
sudo ufw status verbose

echo ""
echo "✅ Firewall configured successfully!"
echo "Your Mac can now access Mission Control on ports 3001 and 5173."
