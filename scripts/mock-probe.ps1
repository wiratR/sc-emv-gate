param([int]$Port = 2222)

Add-Type -AssemblyName System.Net
Add-Type -AssemblyName System.Net.Sockets
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()
Write-Host "[mock-probe] listening TCP on 0.0.0.0:$Port (Ctrl+C to stop)"
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $client.Close()
  }
} finally {
  $listener.Stop()
}
