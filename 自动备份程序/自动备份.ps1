$ErrorActionPreference = 'Stop'

$备份程序目录 = $PSScriptRoot
$项目根目录 = Split-Path -Parent $备份程序目录
$备份根目录 = Join-Path $备份程序目录 '备份'

if (-not (Test-Path -LiteralPath $备份根目录)) {
  New-Item -ItemType Directory -Path $备份根目录 | Out-Null
}

$时间戳 = Get-Date -Format 'yyyyMMdd_HHmmss'
$本次备份目录 = Join-Path $备份根目录 $时间戳
New-Item -ItemType Directory -Path $本次备份目录 | Out-Null

$排除目录 = @(
  $备份程序目录,
  (Join-Path $项目根目录 '.git'),
  (Join-Path $项目根目录 'node_modules')
)

$robocopyArgs = @(
  $项目根目录,
  $本次备份目录,
  '/MIR',
  '/R:1',
  '/W:1',
  '/NFL',
  '/NDL',
  '/NJH',
  '/NJS',
  '/NP'
)

foreach ($d in $排除目录) {
  if (Test-Path -LiteralPath $d) {
    $robocopyArgs += '/XD'
    $robocopyArgs += $d
  }
}

& robocopy @robocopyArgs | Out-Null
$rc = $LASTEXITCODE
if ($rc -gt 7) {
  throw "备份失败：robocopy 返回码 $rc"
}

$现有备份 = Get-ChildItem -LiteralPath $备份根目录 -Directory | Sort-Object Name -Descending
if ($现有备份.Count -gt 5) {
  $需要删除 = $现有备份 | Select-Object -Skip 5
  foreach ($dir in $需要删除) {
    Remove-Item -LiteralPath $dir.FullName -Recurse -Force
  }
}

Write-Host "备份完成：$本次备份目录"
