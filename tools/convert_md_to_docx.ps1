$inputPath = 'C:\Sistema\nwbasset\DOCUMENTACAO_ESQUEMA_NWBASSET.md'
$outputPath = 'C:\Sistema\nwbasset\DOCUMENTACAO_ESQUEMA_NWBASSET.docx'
$wdFormatXMLDocument = 16

if (Test-Path $outputPath) {
  Remove-Item $outputPath -Force
}

$lines = Get-Content -Path $inputPath -Encoding UTF8
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$document = $word.Documents.Add()
$selection = $word.Selection

foreach ($line in $lines) {
  if ($line -match '^#\s+(.+)$') {
    $selection.Style = 'Normal'
    $selection.Font.Bold = $true
    $selection.Font.Size = 16
    $selection.TypeText($matches[1])
  }
  elseif ($line -match '^##\s+(.+)$') {
    $selection.Style = 'Normal'
    $selection.Font.Bold = $true
    $selection.Font.Size = 14
    $selection.TypeText($matches[1])
  }
  elseif ($line -match '^###\s+(.+)$') {
    $selection.Style = 'Normal'
    $selection.Font.Bold = $true
    $selection.Font.Size = 12
    $selection.TypeText($matches[1])
  }
  elseif ($line -match '^####\s+(.+)$') {
    $selection.Style = 'Normal'
    $selection.Font.Bold = $true
    $selection.Font.Size = 11
    $selection.TypeText($matches[1])
  }
  else {
    $selection.Style = 'Normal'
    $selection.Font.Bold = $false
    $selection.Font.Size = 10

    if ($line -match '^-\\s+(.+)$') {
      $selection.TypeText([char]0x2022 + ' ' + $matches[1])
    }
    else {
      $selection.TypeText($line)
    }
  }

  $selection.TypeParagraph()
  $selection.Font.Bold = $false
  $selection.Font.Size = 10
}

$document.SaveAs([ref] $outputPath, [ref] $wdFormatXMLDocument)
$document.Close()
$word.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($selection) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
