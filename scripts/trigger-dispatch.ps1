param(
    [string]$Edition = "AUTO"
)

$logFile = Join-Path $PSScriptRoot "dispatcher.log"
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

function Write-Log {
    param([string]$Message)
    $entry = "[$timestamp] $Message"
    Write-Output $entry
    Add-Content -Path $logFile -Value $entry -ErrorAction SilentlyContinue
}

Write-Log "🚀 Triggering Telegram dispatch for Edition: $Edition"

try {
    # 1. Fetch GitHub Token securely from Git Credential Manager
    $inputData = @"
protocol=https
host=github.com
path=Trilok310/trustpointfin.git
"@
    $credResult = $inputData | git credential fill
    $tokenLine = ($credResult | Select-String "password=").Line
    if (-not $tokenLine) {
        throw "Could not retrieve GitHub PAT from Git Credential Manager."
    }
    $token = $tokenLine.Replace("password=", "").Trim()

    # 2. Build Dispatch Request
    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "TrustPointFin-Local-Dispatcher"
    }

    $body = @{
        ref = "main"
        inputs = @{
            edition = $Edition
            dry_run = $false
        }
    } | ConvertTo-Json

    # 3. Call GitHub Workflow Dispatch API
    $uri = "https://api.github.com/repos/Trilok310/trustpointfin/actions/workflows/334936612/dispatches"
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body

    Write-Log "✅ Workflow dispatch triggered successfully via GitHub API! GitHub runner starting immediately."
} catch {
    Write-Log "❌ Error triggering workflow dispatch: $($_.Exception.Message)"
    exit 1
}
