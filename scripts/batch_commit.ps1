# Batch commit script: commits changes in batches of 3 files and pushes each commit
git add -A
$files = git status --porcelain | ForEach-Object { $_.Substring(3) }
if ($files.Count -eq 0) {
  Write-Output "No changes to commit"
  exit 0
}

for ($i = 0; $i -lt $files.Count; $i += 3) {
  $end = [math]::Min($i + 2, $files.Count - 1)
  $batch = $files[$i..$end]
  $batchNum = [int]($i/3) + 1
  Write-Output ("Committing batch {0}:" -f $batchNum)
  $batch | ForEach-Object { Write-Output "  $_" }

  # Commit only the files in this batch
  git commit -m "chore: batch $batchNum updates" -- $batch

  if ($LASTEXITCODE -ne 0) {
    Write-Output "Commit failed for batch $batchNum, aborting."
    exit 1
  }

  git push origin HEAD
  if ($LASTEXITCODE -ne 0) {
    Write-Output "Push failed for batch $batchNum, aborting."
    exit 1
  }
}

Write-Output "All batches committed and pushed."
