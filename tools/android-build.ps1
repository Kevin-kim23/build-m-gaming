param(
    [ValidateSet('Doctor', 'NewKey', 'Debug', 'Release')]
    [string]$Mode = 'Doctor'
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

# Scope all environment changes to this command, never to the user's system settings.
$oldJava = $env:JAVA_HOME
$oldSdk = $env:ANDROID_HOME
$oldSigning = $env:BUDAE_SIGNING_FILE
try {
    $jdkCandidates = @($env:BUDAE_JAVA_HOME, $env:JAVA_HOME)
    $managedJdkRoot = Join-Path $env:LOCALAPPDATA 'BudaeKiugi/build-tools'
    if (Test-Path -LiteralPath $managedJdkRoot) {
        $jdkCandidates += @(Get-ChildItem -LiteralPath $managedJdkRoot -Directory | Sort-Object Name -Descending | ForEach-Object FullName)
    }
    $jdkPath = $null
    foreach ($candidate in $jdkCandidates) {
        if (-not $candidate -or -not (Test-Path -LiteralPath (Join-Path $candidate 'release'))) { continue }
        $releaseInfo = Get-Content -LiteralPath (Join-Path $candidate 'release') -Raw
        if ($releaseInfo -match 'JAVA_VERSION="21[."]' -and (Test-Path -LiteralPath (Join-Path $candidate 'bin/javac.exe'))) {
            $jdkPath = $candidate; break
        }
    }
    if (-not $jdkPath) { throw 'JDK 21 is required. Set BUDAE_JAVA_HOME to its folder. See docs/ANDROID_RELEASE.md.' }
    $env:JAVA_HOME = $jdkPath
    if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
    if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) { throw 'Android SDK not found. Set ANDROID_HOME.' }
    if (-not $env:BUDAE_SIGNING_FILE) {
        $env:BUDAE_SIGNING_FILE = Join-Path $env:USERPROFILE '.budae-kiugi/signing/upload-signing.json'
    }
    $signingPath = [IO.Path]::GetFullPath($env:BUDAE_SIGNING_FILE)
    if ($signingPath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Signing credentials must be kept outside the Git checkout.'
    }
    $keytool = Join-Path $jdkPath 'bin/keytool.exe'
    if ($Mode -eq 'Doctor') {
        Write-Output "JDK 21: $jdkPath"
        Write-Output "SDK: $env:ANDROID_HOME"
        Write-Output ("SDK 36 installed: " + (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platforms/android-36/android.jar')))
        Write-Output ("Signing configuration present: " + (Test-Path -LiteralPath $signingPath))
        $adb = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
        if (Test-Path -LiteralPath $adb) { & $adb devices -l }
        exit 0
    }
    if ($Mode -eq 'NewKey') {
        $signingDir = Split-Path -Parent $signingPath
        $storePath = Join-Path $signingDir 'upload.p12'
        $certificatePath = Join-Path $signingDir 'upload-certificate.pem'
        foreach ($path in @($signingPath, $storePath, $certificatePath)) {
            if (Test-Path -LiteralPath $path) { throw 'Signing material already exists. Refusing to replace any existing key or password.' }
        }
        New-Item -ItemType Directory -Path $signingDir -Force | Out-Null
        $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
        $acl = New-Object Security.AccessControl.DirectorySecurity
        $acl.SetOwner($sid)
        $acl.SetAccessRuleProtection($true, $false)
        $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
        if ($PSVersionTable.PSEdition -eq 'Desktop') {
            [IO.Directory]::SetAccessControl($signingDir, $acl)
        } else {
            [IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]$signingDir, $acl)
        }
        $randomBytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
        $password = [Convert]::ToBase64String($randomBytes)
        $env:BUDAE_UPLOAD_PASSWORD = $password
        try {
            & $keytool -genkeypair -keystore $storePath -storetype PKCS12 -alias upload -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Dongramco, O=Dongramco' -storepass:env BUDAE_UPLOAD_PASSWORD -keypass:env BUDAE_UPLOAD_PASSWORD
            if ($LASTEXITCODE -ne 0) { throw 'Upload key creation failed; inspect private folder before retrying.' }
            $credentials = @{ storeFile=$storePath; storePassword=$password; keyAlias='upload'; keyPassword=$password }
            [IO.File]::WriteAllText($signingPath, ($credentials | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
            & $keytool -exportcert -rfc -keystore $storePath -alias upload -storepass:env BUDAE_UPLOAD_PASSWORD -file $certificatePath
            if ($LASTEXITCODE -ne 0) { throw 'Certificate export failed. Keep the existing key; do not recreate it.' }
        } finally {
            Remove-Item Env:BUDAE_UPLOAD_PASSWORD -ErrorAction SilentlyContinue
            $password = $null; $credentials = $null
        }
        Write-Output "Upload key and private configuration saved in: $signingDir"
        Write-Output 'Back up BOTH upload.p12 and upload-signing.json in a private encrypted backup outside this PC. Never commit or share them.'
        exit 0
    }
    if ($Mode -eq 'Release' -and -not (Test-Path -LiteralPath $signingPath)) {
        throw 'Upload key missing. Run npm run android:key once, or restore your existing private key/configuration.'
    }
    Push-Location $projectRoot
    try {
        & npm.cmd run android:sync
        if ($LASTEXITCODE -ne 0) { throw 'Web build / native sync failed.' }
        Push-Location (Join-Path $projectRoot 'android')
        try {
            $targets = if ($Mode -eq 'Debug') { @('assembleDebug') } else { @('bundleRelease', 'assembleRelease', 'lintRelease') }
            & .\gradlew.bat @targets --no-daemon --console=plain
            if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
        } finally { Pop-Location }
        if ($Mode -eq 'Release') {
            $bundle = Join-Path $projectRoot 'android/app/build/outputs/bundle/release/app-release.aab'
            $credentials = Get-Content -LiteralPath $signingPath -Raw | ConvertFrom-Json
            $env:BUDAE_UPLOAD_PASSWORD = $credentials.storePassword
            try {
                & (Join-Path $jdkPath 'bin/jarsigner.exe') '-J-Duser.language=en' -verify -strict -keystore $credentials.storeFile -storepass:env BUDAE_UPLOAD_PASSWORD $bundle $credentials.keyAlias
                if ($LASTEXITCODE -ne 0) { throw 'AAB upload signature verification failed.' }
            } finally {
                Remove-Item Env:BUDAE_UPLOAD_PASSWORD -ErrorAction SilentlyContinue
                $credentials = $null
            }
            $hasher = [Security.Cryptography.SHA256]::Create()
            $bundleStream = [IO.File]::OpenRead($bundle)
            try { $bundleHash = [BitConverter]::ToString($hasher.ComputeHash($bundleStream)).Replace('-', '') }
            finally { $bundleStream.Dispose(); $hasher.Dispose() }
            Write-Output "AAB: $bundle"
            Write-Output "SHA-256: $bundleHash"
        }
    } finally { Pop-Location }
} finally {
    $env:JAVA_HOME = $oldJava
    $env:ANDROID_HOME = $oldSdk
    $env:BUDAE_SIGNING_FILE = $oldSigning
}
