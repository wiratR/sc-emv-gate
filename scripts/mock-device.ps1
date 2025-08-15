param(
  [string]$HostUrl = "http://127.0.0.1:3070",
  [string]$Id = "G1-01",
  [string]$Ip = "192.168.1.101",
  [string]$Side = "north",
  [string]$Gate = "G1",
  [string]$Type = "entry",
  [int]$Interval = 5
)

function Send-Hb([string]$status){
  $body = @{
    id=$Id; ip=$Ip; side=$Side; gateId=$Gate; type=$Type;
    status=$status; ts=(Get-Date).ToUniversalTime().ToString("s") + "Z"
  } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$HostUrl/hb" -ContentType "application/json" -Body $body | Out-Null
  Write-Host "[mock-hb] sent: id=$Id status=$status"
}

Write-Host "[mock-hb] loop → $HostUrl id=$Id ip=$Ip every $Interval s"
try {
  while ($true) {
    Send-Hb "online"
    Start-Sleep -Seconds $Interval
  }
} finally {
  Write-Host "[mock-hb] stop"
}
