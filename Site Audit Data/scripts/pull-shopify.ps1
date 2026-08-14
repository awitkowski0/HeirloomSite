# Deep Shopify catalog pull + image download (hard goods only)
$ErrorActionPreference = "Stop"
$Store = if ($env:SHOPIFY_CLI_STORE) { $env:SHOPIFY_CLI_STORE } else { "60xgy4-ut" }
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $PSScriptRoot "..\queries"))) {
  $AuditRoot = Split-Path $PSScriptRoot -Parent
} else {
  $AuditRoot = Split-Path $PSScriptRoot -Parent
}
$AuditRoot = "C:\Users\philw\OneDrive\AI Projects\projects\Vercel - HeirloomCribsSite\Site Audit Data"
$QueryFile = Join-Path $AuditRoot "queries\products-page.graphql"
$RawDir = Join-Path $AuditRoot "raw\shopify"
$ByHandle = Join-Path $RawDir "by-handle"
$ImgRoot = Join-Path $AuditRoot "images\shopify"
$TempDir = "C:\Users\philw\AppData\Local\Temp\opencode\site-audit"
New-Item -ItemType Directory -Force -Path $TempDir, $ByHandle, $ImgRoot | Out-Null

function Write-NoBom($Path, $Content) {
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Test-HardGood($product) {
  $pt = if ($product.productType -ne $null) { $product.productType } else { '' }
  $ti = if ($product.title -ne $null) { $product.title } else { '' }
  $ha = if ($product.handle -ne $null) { $product.handle } else { '' }
  $type = $pt.ToLowerInvariant()
  $title = $ti.ToLowerInvariant()
  $handle = $ha.ToLowerInvariant()
  $blob = "$type $title $handle"
  $deny = @(
    "area rug", "area rugs", "rug", "rugs", "livabliss", "lorena canals",
    "lamp", "lamps", "lighting"
  )
  foreach ($d in $deny) {
    if ($type -eq $d) { return $false }
    if ($type -match [regex]::Escape($d)) { return $false }
  }
  # productType exact hard-good allow list when present
  $allowTypes = @(
    "cribs", "dressers", "chests", "nightstands", "guard rails & conversions",
    "accessories", "changing tables", "mirrors & tops", "box tops"
  )
  if ($type -and ($allowTypes -contains $type)) { return $true }
  # title/handle rug/lamp exclusion
  if ($blob -match '\b(area\s*rug|livabliss|lorena\s*canals)\b') { return $false }
  if ($blob -match '\blamps?\b' -and $blob -notmatch 'clamp') { return $false }
  if ($type -match 'rug|lamp') { return $false }
  return $true
}

function Get-SafeName($name) {
  $s = $name -replace '[<>:"/\\|?*]', '_' -replace '\s+', ' '
  $s = $s.Trim()
  if ([string]::IsNullOrWhiteSpace($s)) { return "_unknown" }
  return $s
}

Write-Host "=== Shopify deep pull (store=$Store) ==="

$all = New-Object System.Collections.Generic.List[object]
$cursor = $null
$page = 0

do {
  $page++
  $varsPath = Join-Path $TempDir "vars-page-$page.json"
  if ($cursor) {
    Write-NoBom $varsPath (@{ cursor = $cursor } | ConvertTo-Json -Compress)
  } else {
    Write-NoBom $varsPath (@{ cursor = $null } | ConvertTo-Json -Compress)
  }
  $outPath = Join-Path $TempDir "page-$page.json"
  Write-Host "Fetching page $page ..."
  & shopify store execute --store $Store --query-file $QueryFile --variable-file $varsPath --json --output-file $outPath
  if ($LASTEXITCODE -ne 0) { throw "shopify store execute failed page $page" }

  $raw = Get-Content -LiteralPath $outPath -Raw -Encoding utf8 | ConvertFrom-Json
  # CLI may wrap under data
  $payload = $raw
  if ($raw.data) { $payload = $raw.data }
  if ($raw.products) { $payload = $raw }
  elseif ($payload.products) { }
  else {
    # try find products
    if ($raw.PSObject.Properties.Name -contains "data") { $payload = $raw.data }
  }

  $productsNode = $payload.products
  if (-not $productsNode) { throw "No products in page $page response" }

  $nodes = @($productsNode.nodes)
  if (-not $nodes -or $nodes.Count -eq 0) {
    # edges shape
    if ($productsNode.edges) {
      $nodes = @($productsNode.edges | ForEach-Object { $_.node })
    }
  }

  Write-Host "  got $($nodes.Count) products"
  foreach ($n in $nodes) { $all.Add($n) }

  $hasNext = [bool]$productsNode.pageInfo.hasNextPage
  $cursor = $productsNode.pageInfo.endCursor
} while ($hasNext)

Write-Host "Total products pulled: $($all.Count)"

$hard = @($all | Where-Object { Test-HardGood $_ })
$excluded = @($all | Where-Object { -not (Test-HardGood $_) })
Write-Host "Hard goods: $($hard.Count) | Excluded (rugs/lamps/etc): $($excluded.Count)"

$catalog = @{
  pulledAt = (Get-Date).ToUniversalTime().ToString("o")
  store = $Store
  storefront = "https://heirloomcribsandmore.com"
  totalPulled = $all.Count
  hardGoodsCount = $hard.Count
  excludedCount = $excluded.Count
  excluded = @($excluded | ForEach-Object { @{ handle = $_.handle; title = $_.title; productType = $_.productType } })
  products = @($hard)
}

$catalogPath = Join-Path $RawDir "catalog.json"
$catalog | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $catalogPath -Encoding utf8
Write-Host "Wrote $catalogPath"

foreach ($p in $hard) {
  $h = Get-SafeName $p.handle
  $p | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $ByHandle "$h.json") -Encoding utf8
}

# Download all images
$manifest = New-Object System.Collections.Generic.List[object]
$imgCount = 0
$failCount = 0
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("User-Agent", "HeirloomSiteAudit/1.0")

foreach ($p in $hard) {
  $h = Get-SafeName $p.handle
  $dir = Join-Path $ImgRoot $h
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $i = 0
  $mediaNodes = @()
  if ($p.media -and $p.media.nodes) { $mediaNodes = @($p.media.nodes) }
  foreach ($m in $mediaNodes) {
    $url = $null
    $w = $null; $ht = $null; $alt = $m.alt
    if ($m.image) {
      $url = $m.image.url
      $w = $m.image.width
      $ht = $m.image.height
      if (-not $alt) { $alt = $m.image.altText }
    }
    if (-not $url) { continue }
    $i++
    $ext = ".jpg"
    if ($url -match '\.(png|webp|gif|jpeg|jpg)(\?|$)') {
      $ext = "." + $Matches[1].ToLower().Replace("jpeg", "jpg")
    }
    $fname = ("media-{0:D3}{1}" -f $i, $ext)
    $dest = Join-Path $dir $fname
    try {
      if (-not (Test-Path -LiteralPath $dest)) {
        $wc.DownloadFile($url, $dest)
      }
      $imgCount++
      $manifest.Add([pscustomobject]@{
        handle = $p.handle
        productTitle = $p.title
        mediaId = $m.id
        alt = $alt
        width = $w
        height = $ht
        sourceUrl = $url
        localPath = "images/shopify/$h/$fname"
        position = $i
        mediaContentType = $m.mediaContentType
      }) | Out-Null
    } catch {
      $failCount++
      Write-Host "  FAIL image $($p.handle) #$i : $($_.Exception.Message)"
    }
  }
  # variant-only images not in media
  if ($p.variants -and $p.variants.nodes) {
    foreach ($v in @($p.variants.nodes)) {
      if (-not $v.image -or -not $v.image.url) { continue }
      $url = $v.image.url
      $already = $false
      foreach ($ex in $manifest) {
        if ($ex.handle -eq $p.handle -and $ex.sourceUrl -eq $url) { $already = $true; break }
      }
      if ($already) { continue }
      $i++
      $ext = ".jpg"
      if ($url -match '\.(png|webp|gif|jpeg|jpg)(\?|$)') {
        $ext = "." + $Matches[1].ToLower().Replace("jpeg", "jpg")
      }
      $fname = ("variant-{0:D3}{1}" -f $i, $ext)
      $dest = Join-Path $dir $fname
      try {
        if (-not (Test-Path -LiteralPath $dest)) {
          $wc.DownloadFile($url, $dest)
        }
        $imgCount++
        $manifest.Add([pscustomobject]@{
          handle = $p.handle
          productTitle = $p.title
          mediaId = $v.image.id
          alt = $v.image.altText
          width = $v.image.width
          height = $v.image.height
          sourceUrl = $url
          localPath = "images/shopify/$h/$fname"
          position = $i
          mediaContentType = "VARIANT_IMAGE"
          variantId = $v.id
          sku = $v.sku
        }) | Out-Null
      } catch {
        $failCount++
      }
    }
  }
}

$wc.Dispose()
$manifestPath = Join-Path $RawDir "image-manifest.json"
@($manifest) | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8

$summary = @{
  hardGoods = $hard.Count
  excluded = $excluded.Count
  imagesDownloaded = $imgCount
  imageFails = $failCount
  catalog = "raw/shopify/catalog.json"
}
$summary | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $RawDir "pull-summary.json") -Encoding utf8
Write-Host "=== Shopify done: $($hard.Count) products, $imgCount images ($failCount fails) ==="
