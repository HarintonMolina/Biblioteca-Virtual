#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
export EXPORT_DIRECTORY="$project_root/docs"
dotnet test "$project_root/tests/SanJacintoVive.Tests/SanJacintoVive.Tests.csproj" --filter 'FullyQualifiedName~ExportacionTests' --nologo
