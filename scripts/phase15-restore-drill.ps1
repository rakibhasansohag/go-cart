$ErrorActionPreference = 'Stop'

$restoreDatabase = 'gocart_restore_drill'
$container = 'gocart'
$containerBackupFile = '/tmp/gocart-phase15-restore-drill.dump'
$containerRestoreFile = '/tmp/gocart-phase15-restore-drill-restore.dump'
$backupFile = Join-Path $env:TEMP 'gocart-phase15-restore-drill.dump'

function Invoke-DockerNative {
    param(
        [Parameter(Mandatory = $true)]
        [string[]] $Arguments
    )

    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed with exit code $LASTEXITCODE."
    }
}

try {
    if (-not (Test-Path -LiteralPath $backupFile)) {
        New-Item -ItemType File -Path $backupFile -Force | Out-Null
    }

    Invoke-DockerNative @('exec', $container, 'sh', '-c', "pg_dump -U gocart -Fc gocart_e2e > $containerBackupFile")
    Invoke-DockerNative @('cp', "${container}:${containerBackupFile}", $backupFile)

    $sourceCount = (& docker exec $container psql -U gocart -d gocart_e2e -Atc 'SELECT count(*) FROM "User";').Trim()
    if ($LASTEXITCODE -ne 0) {
        throw 'Source count query failed.'
    }

    Invoke-DockerNative @('exec', $container, 'psql', '-U', 'gocart', '-d', 'gocart_e2e', '-v', 'ON_ERROR_STOP=1', '-c', "DROP DATABASE IF EXISTS $restoreDatabase;")
    Invoke-DockerNative @('exec', $container, 'psql', '-U', 'gocart', '-d', 'gocart_e2e', '-v', 'ON_ERROR_STOP=1', '-c', "CREATE DATABASE $restoreDatabase;")

    Invoke-DockerNative @('cp', $backupFile, "${container}:${containerRestoreFile}")
    Invoke-DockerNative @('exec', $container, 'pg_restore', '-U', 'gocart', '-d', $restoreDatabase, '--no-owner', '--no-privileges', '--exit-on-error', $containerRestoreFile)

    $restoredCount = (& docker exec $container psql -U gocart -d $restoreDatabase -Atc 'SELECT count(*) FROM "User";').Trim()
    if ($LASTEXITCODE -ne 0) {
        throw 'Restored count query failed.'
    }
    if ($sourceCount -ne $restoredCount) {
        throw "Restore count mismatch: source=$sourceCount restored=$restoredCount."
    }

    Write-Output "Isolated restore drill passed: User count $restoredCount matched source."
}
finally {
    & docker exec $container psql -U gocart -d gocart_e2e -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $restoreDatabase;" | Out-Null
    & docker exec $container rm -f $containerBackupFile | Out-Null
    & docker exec $container rm -f $containerRestoreFile | Out-Null
    Remove-Item -LiteralPath $backupFile -Force -ErrorAction SilentlyContinue
}
