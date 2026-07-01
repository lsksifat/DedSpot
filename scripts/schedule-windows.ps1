# Registers a Windows Scheduled Task that runs the daily OSM ingest.
# Usage (in PowerShell, from anywhere):
#   powershell -ExecutionPolicy Bypass -File scripts\schedule-windows.ps1
#
# Requirements: Docker Desktop + the Postgres container must be running when the
# task fires (the ingest needs the database). Runs `npm run db:ingest` daily.

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$taskName    = 'DedSpot Daily WiFi Ingest'
$runAt       = '03:00'   # 3 AM local time

$action = New-ScheduledTaskAction -Execute 'cmd.exe' `
  -Argument '/c npm run db:ingest' -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $runAt
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Settings $settings -Description 'Daily OpenStreetMap WiFi-spot ingest for DedSpot' -Force

Write-Host "✅ Scheduled '$taskName' to run daily at $runAt in $projectRoot"
Write-Host "   Manage/remove it in Task Scheduler, or: Unregister-ScheduledTask -TaskName '$taskName'"
