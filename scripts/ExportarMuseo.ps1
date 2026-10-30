$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:EXPORT_DIRECTORY = Join-Path $projectRoot "docs"
try {
    dotnet test (Join-Path $projectRoot "tests/SanJacintoVive.Tests/SanJacintoVive.Tests.csproj") --filter "FullyQualifiedName~ExportacionTests" --nologo
    if ($LASTEXITCODE -ne 0) { throw "No se pudo exportar el museo." }
} finally {
    Remove-Item Env:EXPORT_DIRECTORY -ErrorAction SilentlyContinue
}
