#!/bin/bash

# MongoDB Backup Script for Paradise Yatra
# Runs every 6 hours via cron
# Backs up ALL databases in the MongoDB Atlas cluster

# Configuration
BACKUP_DIR="/root/Backups/Mongodb"
MONGODB_URI="mongodb+srv://dikshusharma11:dikshant1140@cluster0.w6ybkdx.mongodb.net"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_NAME="backup_${TIMESTAMP}"
TEMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=30

# Create temp directory
mkdir -p "${TEMP_DIR}"

echo "[$(date)] Starting backup..." >> "${LOG_FILE}"

# Dump ALL databases from the cluster
mongodump --uri="${MONGODB_URI}" --out="${TEMP_DIR}" 2>> "${LOG_FILE}"

if [ $? -eq 0 ]; then
    # Create zip file
    cd "${BACKUP_DIR}"
    zip -r "${BACKUP_NAME}.zip" "temp_${TIMESTAMP}" >> "${LOG_FILE}" 2>&1
    
    # Cleanup temp directory
    rm -rf "${TEMP_DIR}"
    
    # Get file size
    SIZE=$(du -h "${BACKUP_NAME}.zip" | cut -f1)
    echo "[$(date)] Backup completed: ${BACKUP_NAME}.zip (${SIZE})" >> "${LOG_FILE}"
    
    # Cleanup old backups (older than 30 days)
    find "${BACKUP_DIR}" -name "backup_*.zip" -type f -mtime +${RETENTION_DAYS} -delete
    echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days" >> "${LOG_FILE}"
else
    echo "[$(date)] ERROR: Backup failed!" >> "${LOG_FILE}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi
