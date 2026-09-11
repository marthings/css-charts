# Static server for css-charts demos
$Port = 8090
$Root = [System.IO.Path]::GetFullPath($PSScriptRoot)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host "Could not bind http://localhost:$Port/ - is another server already running?"
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "css-charts demo running at http://localhost:$Port/demo/"
Write-Host "Press Ctrl+C to stop."
Start-Process "http://localhost:$Port/demo/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.md'   = 'text/markdown; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.json' = 'application/json'
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = [uri]::UnescapeDataString($request.Url.LocalPath)
    if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') {
      $path = '/demo/index.html'
    }

    # Directory URLs -> index.html
    if ($path.EndsWith('/')) {
      $path = $path + 'index.html'
    }

    $rel = $path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
    $file = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))

    # If path is a directory without trailing slash, serve its index.html
    if (Test-Path -LiteralPath $file -PathType Container) {
      $file = [System.IO.Path]::GetFullPath((Join-Path $file 'index.html'))
    }

    $rootPrefix = $Root.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    $allowed = $file.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -or
               $file.Equals($Root, [StringComparison]::OrdinalIgnoreCase)

    if (-not $allowed) {
      $response.StatusCode = 403
      $buffer = [Text.Encoding]::UTF8.GetBytes('Forbidden')
    }
    elseif (Test-Path -LiteralPath $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) {
        $response.ContentType = $mime[$ext]
      } else {
        $response.ContentType = 'application/octet-stream'
      }
      $buffer = [System.IO.File]::ReadAllBytes($file)
      $response.StatusCode = 200
    }
    else {
      $response.StatusCode = 404
      $msg = 'Not found: ' + $path
      $buffer = [Text.Encoding]::UTF8.GetBytes($msg)
    }

    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
