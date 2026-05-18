Add-Type -AssemblyName System.Drawing

$outPath = Join-Path $PSScriptRoot "..\VXR_DataFlowDiagram.jpeg"

# ==================== Canvas ====================
$W = 2600
$H = 3300
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::White)

# ==================== Fonts ====================
$fontTitle    = New-Object System.Drawing.Font 'Segoe UI', 34, ([System.Drawing.FontStyle]::Bold)
$fontPanelTtl = New-Object System.Drawing.Font 'Segoe UI', 22, ([System.Drawing.FontStyle]::Bold)
$fontGroup    = New-Object System.Drawing.Font 'Segoe UI', 12, ([System.Drawing.FontStyle]::Bold)
$fontNode     = New-Object System.Drawing.Font 'Segoe UI', 13, ([System.Drawing.FontStyle]::Bold)
$fontChip     = New-Object System.Drawing.Font 'Segoe UI', 11, ([System.Drawing.FontStyle]::Bold)
$fontEdge     = New-Object System.Drawing.Font 'Segoe UI', 11
$fontLegend   = New-Object System.Drawing.Font 'Segoe UI', 12

# ==================== Colors ====================
$cExt    = [System.Drawing.Color]::FromArgb(255, 220, 235, 255)
$cExtBr  = [System.Drawing.Color]::FromArgb(255,  60, 110, 180)
$cProc   = [System.Drawing.Color]::FromArgb(255, 225, 250, 225)
$cProcBr = [System.Drawing.Color]::FromArgb(255,  40, 130,  60)
$cStore  = [System.Drawing.Color]::FromArgb(255, 255, 240, 215)
$cStoreBr= [System.Drawing.Color]::FromArgb(255, 180, 120,  20)
$cText   = [System.Drawing.Color]::Black
$cEdge   = [System.Drawing.Color]::FromArgb(255, 70, 70, 70)
$cChip   = [System.Drawing.Color]::FromArgb(255,  40, 130,  60)
$cChipTx = [System.Drawing.Color]::White

# Panel backgrounds
$cPanelA = [System.Drawing.Color]::FromArgb(255, 248, 252, 255)
$cPanelB = [System.Drawing.Color]::FromArgb(255, 250, 255, 250)
$cPanelC = [System.Drawing.Color]::FromArgb(255, 255, 252, 245)

# Group bands for Panel B (subtle tints)
$cBandOnb  = [System.Drawing.Color]::FromArgb(60,  220, 240, 255)
$cBandDisc = [System.Drawing.Color]::FromArgb(60,  255, 235, 215)
$cBandTen  = [System.Drawing.Color]::FromArgb(60,  225, 255, 230)
$cBandCom  = [System.Drawing.Color]::FromArgb(60,  255, 225, 235)
$cBandOps  = [System.Drawing.Color]::FromArgb(60,  235, 230, 255)

$penEdge = New-Object System.Drawing.Pen $cEdge, 1.8
$penEdge.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6,6,$true
$penEdge.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$penBorderExt   = New-Object System.Drawing.Pen $cExtBr, 2.2
$penBorderProc  = New-Object System.Drawing.Pen $cProcBr, 2.2
$penBorderStore = New-Object System.Drawing.Pen $cStoreBr, 2.2
$brushText = New-Object System.Drawing.SolidBrush $cText
$brushEdge = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,40,40,40))

# ==================== Drawing primitives ====================
function Draw-CenteredText {
    param([string]$text, [single]$cx, [single]$cy, $font, $brush, [single]$maxWidth, [single]$maxHeight = 80)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF (($cx - $maxWidth/2), ($cy - $maxHeight/2), $maxWidth, $maxHeight)
    $g.DrawString($text, $font, $brush, $rect, $sf)
}

function Draw-Entity {
    param([string]$name, [single]$x, [single]$y, [single]$w = 230, [single]$h = 80)
    $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
    $brush = New-Object System.Drawing.SolidBrush $cExt
    $g.FillRectangle($brush, $rect)
    $g.DrawRectangle($penBorderExt, $x, $y, $w, $h)
    Draw-CenteredText $name ($x + $w/2) ($y + $h/2) $fontNode $brushText ($w - 10) ($h - 10)
    $brush.Dispose()
    return @{ x = $x; y = $y; w = $w; h = $h; cx = ($x + $w/2); cy = ($y + $h/2) }
}

function Draw-Process {
    param([string]$id, [string]$name, [single]$x, [single]$y, [single]$w = 260, [single]$h = 110)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $r = 26
    $path.AddArc($x,                    $y,                    $r*2, $r*2, 180, 90)
    $path.AddArc($x + $w - $r*2,        $y,                    $r*2, $r*2, 270, 90)
    $path.AddArc($x + $w - $r*2,        $y + $h - $r*2,        $r*2, $r*2,   0, 90)
    $path.AddArc($x,                    $y + $h - $r*2,        $r*2, $r*2,  90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush $cProc
    $g.FillPath($brush, $path)
    $g.DrawPath($penBorderProc, $path)
    # Name centered in the bubble
    Draw-CenteredText $name ($x + $w/2) ($y + $h/2 + 8) $fontNode $brushText ($w - 14) ($h - 30)
    # ID chip at top-left
    $chipW = 52; $chipH = 24
    $chipRect = New-Object System.Drawing.RectangleF ($x + 12), ($y + 10), $chipW, $chipH
    $chipBrush = New-Object System.Drawing.SolidBrush $cChip
    $g.FillRectangle($chipBrush, $chipRect)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($id, $fontChip, (New-Object System.Drawing.SolidBrush $cChipTx), $chipRect, $sf)
    $path.Dispose(); $brush.Dispose(); $chipBrush.Dispose()
    return @{ x = $x; y = $y; w = $w; h = $h; cx = ($x + $w/2); cy = ($y + $h/2) }
}

function Draw-Store {
    param([string]$id, [string]$name, [single]$x, [single]$y, [single]$w = 280, [single]$h = 70)
    $brush = New-Object System.Drawing.SolidBrush $cStore
    $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
    $g.FillRectangle($brush, $rect)
    $left = New-Object System.Drawing.RectangleF $x, $y, 44, $h
    $brushLeft = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,245,220,180))
    $g.FillRectangle($brushLeft, $left)
    $g.DrawLine($penBorderStore, $x, $y, ($x + $w), $y)
    $g.DrawLine($penBorderStore, $x, ($y + $h), ($x + $w), ($y + $h))
    $g.DrawLine($penBorderStore, $x, $y, $x, ($y + $h))
    $g.DrawLine($penBorderStore, ($x + 44), $y, ($x + 44), ($y + $h))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($id, $fontNode, $brushText, $left, $sf)
    $right = New-Object System.Drawing.RectangleF ($x + 48), $y, ($w - 52), $h
    $g.DrawString($name, $fontNode, $brushText, $right, $sf)
    $brush.Dispose(); $brushLeft.Dispose()
    return @{ x = $x; y = $y; w = $w; h = $h; cx = ($x + $w/2); cy = ($y + $h/2); _anchorCount = 0 }
}

# ==================== Panel + group helpers ====================
function Draw-PanelBackground {
    param([single]$x, [single]$y, [single]$w, [single]$h, $color, [string]$title)
    $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
    $b = New-Object System.Drawing.SolidBrush $color
    $g.FillRectangle($b, $rect)
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,200,200,210)), 1.5
    $g.DrawRectangle($borderPen, $x, $y, $w, $h)
    # Title bar
    $titleBar = New-Object System.Drawing.RectangleF $x, $y, $w, 56
    $tb = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 245, 250))
    $g.FillRectangle($tb, $titleBar)
    $g.DrawLine($borderPen, $x, ($y + 56), ($x + $w), ($y + 56))
    $g.DrawString($title, $fontPanelTtl, $brushText, ($x + 20), ($y + 12))
    $b.Dispose(); $tb.Dispose(); $borderPen.Dispose()
}

function Draw-GroupBand {
    param([single]$x, [single]$y, [single]$w, [single]$h, $color, [string]$label)
    $rect = New-Object System.Drawing.RectangleF $x, $y, $w, $h
    $b = New-Object System.Drawing.SolidBrush $color
    $g.FillRectangle($b, $rect)
    # Dashed border
    $p = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180,140,140,160)), 1
    $p.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $g.DrawRectangle($p, $x, $y, $w, $h)
    # Label OUTSIDE the band, above it, so it never overlaps the processes inside
    if ($label -ne "") {
        $size = $g.MeasureString($label, $fontGroup)
        $tagBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240,255,255,255))
        $tagRect = New-Object System.Drawing.RectangleF ($x + 6), ($y - 22), ($size.Width + 14), 18
        $g.FillRectangle($tagBg, $tagRect)
        $g.DrawRectangle($p, $tagRect.X, $tagRect.Y, $tagRect.Width, $tagRect.Height)
        $g.DrawString($label, $fontGroup, $brushText, ($x + 12), ($y - 22))
        $tagBg.Dispose()
    }
    $b.Dispose(); $p.Dispose()
}

function Draw-MiniLegend {
    param([single]$x, [single]$y)
    # Inline mini-legend stacked vertically in a small box
    $boxW = 260; $boxH = 150
    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230,255,255,255))
    $g.FillRectangle($bg, $x, $y, $boxW, $boxH)
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,200,200,210)), 1
    $g.DrawRectangle($borderPen, $x, $y, $boxW, $boxH)
    $g.DrawString("Legend", $fontGroup, $brushText, ($x + 10), ($y + 6))

    # Entity swatch
    $sy = $y + 30
    $sw = New-Object System.Drawing.RectangleF ($x + 12), $sy, 28, 20
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $cExt), $sw)
    $g.DrawRectangle($penBorderExt, $sw.X, $sw.Y, $sw.Width, $sw.Height)
    $g.DrawString("External entity", $fontLegend, $brushText, ($x + 48), ($sy + 2))

    # Process swatch
    $sy2 = $y + 60
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x + 12,         $sy2,        10, 10, 180, 90)
    $path.AddArc($x + 12 + 18,    $sy2,        10, 10, 270, 90)
    $path.AddArc($x + 12 + 18,    $sy2 + 10,   10, 10,   0, 90)
    $path.AddArc($x + 12,         $sy2 + 10,   10, 10,  90, 90)
    $path.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $cProc), $path)
    $g.DrawPath($penBorderProc, $path)
    $g.DrawString("Process (numbered)", $fontLegend, $brushText, ($x + 48), ($sy2 + 2))
    $path.Dispose()

    # Store swatch
    $sy3 = $y + 90
    $ls = New-Object System.Drawing.RectangleF ($x + 12), $sy3, 28, 20
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $cStore), $ls)
    $g.DrawLine($penBorderStore, ($x + 12), $sy3, ($x + 40), $sy3)
    $g.DrawLine($penBorderStore, ($x + 12), ($sy3 + 20), ($x + 40), ($sy3 + 20))
    $g.DrawLine($penBorderStore, ($x + 12), $sy3, ($x + 12), ($sy3 + 20))
    $g.DrawLine($penBorderStore, ($x + 22), $sy3, ($x + 22), ($sy3 + 20))
    $g.DrawString("Data store", $fontLegend, $brushText, ($x + 48), ($sy3 + 2))

    # Arrow swatch
    $sy4 = $y + 120
    $g.DrawLine($penEdge, ($x + 12), ($sy4 + 10), ($x + 40), ($sy4 + 10))
    $g.DrawString("Data flow", $fontLegend, $brushText, ($x + 48), ($sy4 + 2))

    $bg.Dispose(); $borderPen.Dispose()
}

# ==================== Edge routing ====================
function Anchor {
    param($node, [string]$side, [single]$offsetFrac = 0.5)
    switch ($side) {
        "L" { return @{ x = $node.x;             y = ($node.y + $node.h * $offsetFrac) } }
        "R" { return @{ x = ($node.x + $node.w); y = ($node.y + $node.h * $offsetFrac) } }
        "T" { return @{ x = ($node.x + $node.w * $offsetFrac); y = $node.y } }
        "B" { return @{ x = ($node.x + $node.w * $offsetFrac); y = ($node.y + $node.h) } }
    }
}

function Draw-LabelPill {
    param([single]$mx, [single]$my, [string]$label)
    if ($label -eq "") { return }
    $size = $g.MeasureString($label, $fontEdge)
    $pad = 6
    $bgRect = New-Object System.Drawing.RectangleF ($mx - $size.Width/2 - $pad), ($my - $size.Height/2 - $pad), ($size.Width + $pad*2), ($size.Height + $pad*2)
    # Halo
    $halo = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,255,255,255))
    $g.FillRectangle($halo, $bgRect)
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,210,210,220)), 0.8
    $g.DrawRectangle($borderPen, $bgRect.X, $bgRect.Y, $bgRect.Width, $bgRect.Height)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($label, $fontEdge, $brushEdge, $bgRect, $sf)
    $halo.Dispose(); $borderPen.Dispose()
}

# Draw an orthogonal path through specified waypoints, arrowhead on last segment.
function Draw-Path {
    param([System.Collections.IList]$pts, [string]$label = "", [single]$labelSegment = -1)
    for ($i = 0; $i -lt ($pts.Count - 1); $i++) {
        if ($i -eq ($pts.Count - 2)) {
            $g.DrawLine($penEdge, $pts[$i], $pts[$i+1])
        } else {
            $penPlain = New-Object System.Drawing.Pen $cEdge, 1.8
            $g.DrawLine($penPlain, $pts[$i], $pts[$i+1])
            $penPlain.Dispose()
        }
    }
    if ($label -ne "") {
        if ($labelSegment -lt 0) {
            $mid = [int]([Math]::Floor(($pts.Count - 1) / 2))
        } else {
            $mid = [int]$labelSegment
        }
        $sA = $pts[$mid]; $sB = $pts[$mid + 1]
        $mx = ($sA.X + $sB.X) / 2
        $my = ($sA.Y + $sB.Y) / 2
        Draw-LabelPill $mx $my $label
    }
}

# Simple two-bend orthogonal edge using a horizontal lane Y for the middle bus
function Draw-OrthoLane {
    param(
        $from, [string]$fromSide,
        $to,   [string]$toSide,
        [single]$laneY,
        [single]$fromOffset = 0.5,
        [single]$toOffset   = 0.5,
        [string]$label = "",
        [switch]$twoWay
    )
    $a = Anchor $from $fromSide $fromOffset
    $b = Anchor $to   $toSide   $toOffset
    $pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x), ([single]$a.y)))
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x), ([single]$laneY)))
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x), ([single]$laneY)))
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x), ([single]$b.y)))
    Draw-Path $pts $label 1  # label on the horizontal lane segment

    if ($twoWay) {
        $penRev = New-Object System.Drawing.Pen $cEdge, 1.8
        $penRev.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6,6,$true
        # Reverse arrow uses the same path but draw in reverse on the lane
        $g.DrawLine($penRev, $pts[2], $pts[1])
        $penRev.Dispose()
    }
}

# Direct orthogonal edge - L-shape with one bend
function Draw-Ortho {
    param(
        $from, [string]$fromSide,
        $to,   [string]$toSide,
        [string]$label = "",
        [single]$fromOffset = 0.5,
        [single]$toOffset   = 0.5,
        [switch]$twoWay
    )
    $a = Anchor $from $fromSide $fromOffset
    $b = Anchor $to   $toSide   $toOffset

    $pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x), ([single]$a.y)))
    if (($fromSide -eq "R" -or $fromSide -eq "L") -and ($toSide -eq "L" -or $toSide -eq "R")) {
        $midX = ($a.x + $b.x) / 2
        [void]$pts.Add((New-Object System.Drawing.PointF ([single]$midX, [single]$a.y)))
        [void]$pts.Add((New-Object System.Drawing.PointF ([single]$midX, [single]$b.y)))
    }
    elseif (($fromSide -eq "T" -or $fromSide -eq "B") -and ($toSide -eq "T" -or $toSide -eq "B")) {
        $midY = ($a.y + $b.y) / 2
        [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x, [single]$midY)))
        [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x, [single]$midY)))
    }
    elseif (($fromSide -eq "R" -or $fromSide -eq "L") -and ($toSide -eq "T" -or $toSide -eq "B")) {
        [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x, [single]$a.y)))
    }
    elseif (($fromSide -eq "T" -or $fromSide -eq "B") -and ($toSide -eq "L" -or $toSide -eq "R")) {
        [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x, [single]$b.y)))
    }
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x, [single]$b.y)))

    # Label on the longest segment
    $bestLen = -1.0; $bestSeg = 0
    for ($i = 0; $i -lt ($pts.Count - 1); $i++) {
        $dx = $pts[$i+1].X - $pts[$i].X; $dy = $pts[$i+1].Y - $pts[$i].Y
        $len = [Math]::Sqrt($dx*$dx + $dy*$dy)
        if ($len -gt $bestLen) { $bestLen = $len; $bestSeg = $i }
    }
    Draw-Path $pts $label $bestSeg

    if ($twoWay) {
        $penRev = New-Object System.Drawing.Pen $cEdge, 1.8
        $penRev.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6,6,$true
        $g.DrawLine($penRev, $pts[1], $pts[0])
        $penRev.Dispose()
    }
}

# Vertical edge from a process bottom to a store top, with multi-anchor distribution on the store.
# Uses an explicit lane Y in the corridor between processes and stores so arrows don't collide.
function Draw-DownLane {
    param($from, $to, [string]$label, [single]$laneY, [single]$storeOffset = 0.5, [single]$procOffset = 0.5)
    $a = Anchor $from "B" $procOffset
    $b = Anchor $to   "T" $storeOffset
    $pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x), ([single]$a.y)))
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$a.x), ([single]$laneY)))
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x), ([single]$laneY)))
    [void]$pts.Add((New-Object System.Drawing.PointF ([single]$b.x), ([single]$b.y)))
    Draw-Path $pts $label 1
}

# ==================== TITLE ====================
$g.DrawString("VXR Rental Web Application - Data Flow Diagram", $fontTitle, $brushText, 380, 24)
$g.DrawString("Three-panel layout: Context (Level 0), Level 1 Actor View, Level 1 Data View", $fontLegend, $brushText, 380, 76)

# ====================================================================
# PANEL A - CONTEXT DIAGRAM (Level 0)
# ====================================================================
$panelAy = 120; $panelAh = 700
Draw-PanelBackground 40 $panelAy ($W - 80) $panelAh $cPanelA "Panel A - Context Diagram (Level 0)"

$ctxProc = Draw-Process "0" "VXR Rental`nWeb Application" 1100 320 380 180

$cTenant = Draw-Entity "Tenant"   260 280 220 80
$cLand   = Draw-Entity "Landlord" 260 410 220 80
$cAdmin  = Draw-Entity "Admin"    260 540 220 80

$cPaymongo = Draw-Entity "PayMongo Gateway"  1900 240 280 80
$cStripe   = Draw-Entity "Stripe Gateway"    1900 350 280 80
$cGmaps    = Draw-Entity "Google Maps API"   1900 460 280 80
$cPsgc     = Draw-Entity "PSGC API"          1900 570 280 80
$cSupa     = Draw-Entity "Supabase`n(Auth + DB + Storage + Edge Fns)" 1850 690 380 90

# Context flows
Draw-Ortho $cTenant R $ctxProc L "browse / apply / pay / chat" 0.5 0.2
Draw-Ortho $ctxProc L $cTenant R "listings / contract / alerts" 0.3 0.5
Draw-Ortho $cLand   R $ctxProc L "list / approve / manage" 0.5 0.45
Draw-Ortho $ctxProc L $cLand   R "applications / payments" 0.55 0.5
Draw-Ortho $cAdmin  R $ctxProc L "verify / moderate / CMS" 0.5 0.75
Draw-Ortho $ctxProc L $cAdmin  R "audit / KYC queue" 0.8 0.5

Draw-Ortho $ctxProc R $cPaymongo L "PaymentIntent / attach" 0.2 0.5
Draw-Ortho $cPaymongo L $ctxProc R "webhook: paid / failed" 0.5 0.35
Draw-Ortho $ctxProc R $cStripe   L "card token (alt)" 0.4 0.5
Draw-Ortho $ctxProc R $cGmaps    L "geocode / address" 0.6 0.5
Draw-Ortho $ctxProc R $cPsgc     L "region / city" 0.75 0.5
Draw-Ortho $ctxProc B $cSupa     T "SQL / Auth / Storage / Functions" 0.5 0.5 -twoWay

Draw-MiniLegend ($W - 320) ($panelAy + 80)

# ====================================================================
# PANEL B - LEVEL 1: ACTOR VIEW
# ====================================================================
$panelBy = 860; $panelBh = 880
Draw-PanelBackground 40 $panelBy ($W - 80) $panelBh $cPanelB "Panel B - Level 1: Actor View (entities + processes + inter-process flows)"

# Process grid - 3 rows x 4 cols. Wider gaps to leave routing corridors.
$gridLeft = 440
$colW     = 320       # column width including gap
$rowH     = 220       # row height including gap
$pBoxW    = 260
$pBoxH    = 110
$gridTop  = $panelBy + 130

# Pre-compute column X centers
$col1 = $gridLeft + 0
$col2 = $gridLeft + $colW
$col3 = $gridLeft + 2 * $colW
$col4 = $gridLeft + 3 * $colW

$row1 = $gridTop + 0
$row2 = $gridTop + $rowH
$row3 = $gridTop + 2 * $rowH

# Group bands (drawn first so processes sit on top)
# Onboarding band — covers col 1 row 1
Draw-GroupBand ($col1 - 18) ($row1 - 18) ($pBoxW + 36) ($pBoxH + 36) $cBandOnb "Onboarding"
# Discovery & Apply — covers cols 2,3,4 of row 1
Draw-GroupBand ($col2 - 18) ($row1 - 18) ($colW * 3 - $colW + $pBoxW + 36) ($pBoxH + 36) $cBandDisc "Discovery & Apply"
# Tenancy lifecycle — covers col 1,2 row 2 plus col 4 row 2 (5.0, 6.0, 8.0)
Draw-GroupBand ($col1 - 18) ($row2 - 18) ($colW + $pBoxW + 36) ($pBoxH + 36) $cBandTen "Tenancy lifecycle"
Draw-GroupBand ($col4 - 18) ($row2 - 18) ($pBoxW + 36) ($pBoxH + 36) $cBandTen ""
# Comms — col 3 row 2 (7.0) and col 1 row 3 (10.0)
Draw-GroupBand ($col3 - 18) ($row2 - 18) ($pBoxW + 36) ($pBoxH + 36) $cBandCom "Comms"
Draw-GroupBand ($col1 - 18) ($row3 - 18) ($pBoxW + 36) ($pBoxH + 36) $cBandCom ""
# Operations — col 3 row 1? no — col 4 row 1 is 4.0 already in Discovery
# We placed 9.0, 11.0, 12.0 in row 3 cols 2,3,4 — but we'll only have 12 processes, let me just band the row 3
Draw-GroupBand ($col2 - 18) ($row3 - 18) ($colW * 2 + $pBoxW + 36) ($pBoxH + 36) $cBandOps "Operations"

# Place processes — 3x4 grid. Keep same positions in Panel C.
$pAuth  = Draw-Process "1.0"  "Auth / Profile`nManagement"   $col1 $row1 $pBoxW $pBoxH
$pList  = Draw-Process "2.0"  "Listing & Search"             $col2 $row1 $pBoxW $pBoxH
$pWish  = Draw-Process "3.0"  "Wishlist"                     $col3 $row1 $pBoxW $pBoxH
$pApp   = Draw-Process "4.0"  "Application`nProcessing"      $col4 $row1 $pBoxW $pBoxH

$pCont  = Draw-Process "5.0"  "Contract`nManagement"         $col1 $row2 $pBoxW $pBoxH
$pPay   = Draw-Process "6.0"  "Payment`nProcessing"          $col2 $row2 $pBoxW $pBoxH
$pMsg   = Draw-Process "7.0"  "Messaging"                    $col3 $row2 $pBoxW $pBoxH
$pTen   = Draw-Process "8.0"  "Tenant /`nIn-Stay Mgmt"       $col4 $row2 $pBoxW $pBoxH

$pNotif = Draw-Process "10.0" "Notifications"                $col1 $row3 $pBoxW $pBoxH
$pRep   = Draw-Process "9.0"  "Reports /`nMaintenance"       $col2 $row3 $pBoxW $pBoxH
$pAdmin = Draw-Process "11.0" "Admin Verification`n& CMS"    $col3 $row3 $pBoxW $pBoxH
$pMedia = Draw-Process "12.0" "Media & Document`nStorage"    $col4 $row3 $pBoxW $pBoxH

# External entities - left column (3) and right column (4)
$entLeftX = 130
$tenant   = Draw-Entity "Tenant"   $entLeftX ($row1 + 15) 220 80
$landlord = Draw-Entity "Landlord" $entLeftX ($row2 + 15) 220 80
$admin    = Draw-Entity "Admin"    $entLeftX ($row3 + 15) 220 80

$entRightX = $W - 250
$paymongo = Draw-Entity "PayMongo"     $entRightX ($row1 - 30) 200 80
$stripe   = Draw-Entity "Stripe"       $entRightX ($row1 + 80) 200 80
$gmaps    = Draw-Entity "Google Maps"  $entRightX ($row2 + 0)  200 80
$psgc     = Draw-Entity "PSGC API"     $entRightX ($row2 + 110) 200 80

# ----- Left-entity flows (each entity gets its own lane in the left corridor) -----
$laneTenant   = $row1 + 60
$laneTenant2  = $row1 + 80
$laneLandlord = $row2 + 60
$laneLandlord2= $row2 + 80
$laneAdmin    = $row3 + 60

# Tenant interactions
Draw-OrthoLane $tenant R $pAuth L $laneTenant 0.3 0.3 "credentials"
Draw-OrthoLane $tenant R $pCont L ($row2 + 60) 0.7 0.3 "sign / accept"
Draw-OrthoLane $tenant R $pPay  L ($row2 + 30) 0.5 0.2 "pay rent"
Draw-OrthoLane $tenant R $pMsg  L ($row2 + 90) 0.5 0.4 "chat"
Draw-OrthoLane $tenant R $pTen  L ($row2 + 50) 0.5 0.6 "in-stay view"

# Landlord interactions
Draw-OrthoLane $landlord R $pList L ($row1 + 90) 0.3 0.7 "create listing"
Draw-OrthoLane $landlord R $pApp  L ($row1 + 105) 0.7 0.7 "approve / reject"
Draw-OrthoLane $landlord R $pCont L ($row2 + 90) 0.5 0.7 "issue contract"
Draw-OrthoLane $landlord R $pPay  L ($row2 + 50) 0.5 0.8 "record offline"
Draw-OrthoLane $landlord R $pTen  L ($row2 + 75) 0.5 0.4 "tenant overview"
Draw-OrthoLane $landlord R $pRep  L ($row3 + 50) 0.3 0.5 "resolve issues"

# Tenant browse / wishlist / apply / report
Draw-OrthoLane $tenant R $pList L ($row1 + 75) 0.5 0.4 "search / filter"
Draw-OrthoLane $tenant R $pWish L ($row1 + 95) 0.5 0.5 "save listing"
Draw-OrthoLane $tenant R $pApp  L ($row1 + 60) 0.5 0.4 "apply + docs"
Draw-OrthoLane $tenant R $pRep  L ($row3 + 30) 0.5 0.5 "submit issue"

# Admin
Draw-OrthoLane $admin R $pAdmin L ($row3 + 55) 0.5 0.5 "review / moderate"

# ----- Right-entity flows -----
# PayMongo bi-directional with Payment
Draw-OrthoLane $pPay R $paymongo L ($row1 + 75) 0.4 0.4 "intent / attach"
Draw-OrthoLane $paymongo L $pPay R ($row1 + 30) 0.6 0.2 "webhook"

# Stripe alt
Draw-OrthoLane $pPay R $stripe L ($row1 + 130) 0.6 0.4 "card token"

# Google Maps -> Listing
Draw-OrthoLane $gmaps L $pList R ($row1 + 65) 0.4 0.5 "geocode"

# PSGC -> Listing
Draw-OrthoLane $psgc L $pList R ($row1 + 130) 0.4 0.5 "region / city"

# ----- Inter-process flows (notification fan-in/out, media uploads) -----
# Notifications fan-in (4.0, 6.0, 7.0, 9.0 -> 10.0)
Draw-OrthoLane $pApp  B $pNotif T ($row3 - 30) 0.5 0.3 "app status"
Draw-OrthoLane $pPay  B $pNotif T ($row3 - 50) 0.5 0.5 "payment event"
Draw-OrthoLane $pMsg  B $pNotif T ($row3 - 70) 0.5 0.7 "new message"
Draw-OrthoLane $pRep  T $pNotif R ($row3 + 50) 0.5 0.7 "report update"

# Notifications fan-out
Draw-OrthoLane $pNotif L $tenant R ($row3 + 30) 0.3 0.7 "alerts"
Draw-OrthoLane $pNotif L $landlord R ($row3 + 10) 0.5 0.7 ""

# Media uploads (2.0, 4.0, 5.0 -> 12.0)
Draw-OrthoLane $pList R $pMedia T ($row3 - 30) 0.7 0.3 "image upload"
Draw-OrthoLane $pApp  B $pMedia T ($row3 - 90) 0.7 0.5 "ID / income"
Draw-OrthoLane $pCont B $pMedia T ($row3 - 110) 0.7 0.7 "signed PDF"

Draw-MiniLegend 60 ($panelBy + $panelBh - 170)

# ====================================================================
# PANEL C - LEVEL 1: DATA VIEW
# ====================================================================
$panelCy = $panelBy + $panelBh + 30; $panelCh = 1440
Draw-PanelBackground 40 $panelCy ($W - 80) $panelCh $cPanelC "Panel C - Level 1: Data View (processes + data stores only)"

# Re-place processes in same grid positions for visual continuity
$cGridTop = $panelCy + 90
$cRow1 = $cGridTop + 0
$cRow2 = $cGridTop + $rowH
$cRow3 = $cGridTop + 2 * $rowH

$cpAuth  = Draw-Process "1.0"  "Auth / Profile`nManagement"   $col1 $cRow1 $pBoxW $pBoxH
$cpList  = Draw-Process "2.0"  "Listing & Search"             $col2 $cRow1 $pBoxW $pBoxH
$cpWish  = Draw-Process "3.0"  "Wishlist"                     $col3 $cRow1 $pBoxW $pBoxH
$cpApp   = Draw-Process "4.0"  "Application`nProcessing"      $col4 $cRow1 $pBoxW $pBoxH

$cpCont  = Draw-Process "5.0"  "Contract`nManagement"         $col1 $cRow2 $pBoxW $pBoxH
$cpPay   = Draw-Process "6.0"  "Payment`nProcessing"          $col2 $cRow2 $pBoxW $pBoxH
$cpMsg   = Draw-Process "7.0"  "Messaging"                    $col3 $cRow2 $pBoxW $pBoxH
$cpTen   = Draw-Process "8.0"  "Tenant /`nIn-Stay Mgmt"       $col4 $cRow2 $pBoxW $pBoxH

$cpNotif = Draw-Process "10.0" "Notifications"                $col1 $cRow3 $pBoxW $pBoxH
$cpRep   = Draw-Process "9.0"  "Reports /`nMaintenance"       $col2 $cRow3 $pBoxW $pBoxH
$cpAdmin = Draw-Process "11.0" "Admin Verification`n& CMS"    $col3 $cRow3 $pBoxW $pBoxH
$cpMedia = Draw-Process "12.0" "Media & Document`nStorage"    $col4 $cRow3 $pBoxW $pBoxH

# Data store rows below the process grid - 2 banded rows + 1 full-width footer
$storesY1 = $cRow3 + $pBoxH + 220
$storesY2 = $storesY1 + 110
$storesY3 = $storesY2 + 110

# Compute lane Ys for routing corridor between processes and stores
$lane_r1 = $cRow1 + $pBoxH + 50
$lane_r2 = $cRow2 + $pBoxH + 50
$lane_r3 = $cRow3 + $pBoxH + 50
$lane_main = $cRow3 + $pBoxH + 130

# Row 1 stores - lay out under col1..col4 of process grid
$dProf  = Draw-Store "D1"  "profile"                  ($col1 - 20) $storesY1 260 70
$dList  = Draw-Store "D2"  "listing / listings_full"  ($col2 - 20) $storesY1 300 70
$dImg   = Draw-Store "D3"  "listing_image"            ($col2 + 300) $storesY1 240 70
$dBook  = Draw-Store "D4"  "bookmark (wishlist)"      ($col3 + 20) $storesY1 260 70
$dApp   = Draw-Store "D5"  "application"              ($col4 - 30) $storesY1 230 70
$dAppD  = Draw-Store "D6"  "application_document"     ($col4 + 210) $storesY1 280 70

# Row 2 stores
$dCont  = Draw-Store "D7"  "contract"                 ($col1 - 20) $storesY2 260 70
$dPay   = Draw-Store "D8"  "payment"                  ($col2 - 20) $storesY2 220 70
$dPayM  = Draw-Store "D9"  "payment_method"           ($col2 + 210) $storesY2 260 70
$dMsg   = Draw-Store "D10" "conversation / message"   ($col3 + 0)  $storesY2 300 70
$dRep   = Draw-Store "D12" "maintenance_report"       ($col2 + 480) $storesY2 270 70
$dMove  = Draw-Store "D15" "move_out_checklist"       ($col4 + 0)  $storesY2 260 70

# Row 3 stores
$dNot   = Draw-Store "D11" "notification"             ($col1 - 20) $storesY3 240 70
$dVer   = Draw-Store "D13" "verification (KYC)"       ($col1 + 230) $storesY3 270 70
$dAdmRO = Draw-Store "D14" "admin_user / audit_log"   ($col2 + 220) $storesY3 280 70
$dCms   = Draw-Store "D16" "cms_content"              ($col3 + 230) $storesY3 240 70

# Full-width D17 footer
$dBuck  = Draw-Store "D17" "Supabase Storage Buckets  (listing-images, application-documents, listing-contracts)" ($col1 - 20) ($storesY3 + 110) 1820 70

# ----- Process -> Store flows using lane routing -----
# Row 1 processes (1.0..4.0) writing to row 1 stores
Draw-DownLane $cpAuth  $dProf "upsert profile"  $lane_r1 0.5 0.5
Draw-DownLane $cpAuth  $dVer  "submit KYC"      $lane_r1 0.5 0.3
Draw-DownLane $cpList  $dList "CRUD listing"    $lane_r1 0.5 0.5
Draw-DownLane $cpList  $dImg  "image refs"      $lane_r1 0.5 0.7
Draw-DownLane $cpWish  $dBook "bookmark row"    $lane_r1 0.5 0.5
Draw-DownLane $cpApp   $dApp  "insert app"      $lane_r1 0.5 0.3
Draw-DownLane $cpApp   $dAppD "doc rows"        $lane_r1 0.5 0.5

# Row 2 processes (5.0..8.0)
Draw-DownLane $cpCont $dCont "contract row"     $lane_r2 0.5 0.5
Draw-DownLane $cpPay  $dPay  "payment row"      $lane_r2 0.5 0.5
Draw-DownLane $cpPay  $dPayM "saved methods"    $lane_r2 0.5 0.5
Draw-DownLane $cpMsg  $dMsg  "message row"      $lane_r2 0.5 0.5
Draw-DownLane $cpTen  $dCont "active contract"  $lane_r2 0.3 0.7
Draw-DownLane $cpTen  $dMove "checklist"        $lane_r2 0.5 0.5

# Row 3 processes (10.0, 9.0, 11.0, 12.0) - flow downward to row 3 stores or D17
Draw-DownLane $cpNotif $dNot   "notif rows"     $lane_r3 0.5 0.5
Draw-DownLane $cpRep   $dRep   "report rows"    $lane_r3 0.5 0.5
Draw-DownLane $cpAdmin $dAdmRO "audit logs"     $lane_r3 0.3 0.5
Draw-DownLane $cpAdmin $dCms   "CMS content"    $lane_r3 0.7 0.5
Draw-DownLane $cpAdmin $dVer   "verify/reject"  $lane_r3 0.5 0.7

# Media -> storage buckets + image refs
Draw-DownLane $cpMedia $dBuck "store files"     $lane_main 0.5 0.5
Draw-DownLane $cpMedia $dImg  "image URLs"      $lane_r1 0.5 0.5

# Admin can also moderate listings (cross-row flow)
Draw-DownLane $cpAdmin $dList "moderate"        $lane_r3 0.5 0.7

Draw-MiniLegend ($W - 320) ($panelCy + $panelCh - 170)

# ==================== Footer ====================
$g.DrawString("Source: vxr-web / my-react-app  -  Notation: Hybrid Yourdon / Gane-Sarson", $fontLegend, $brushText, 60, ($H - 50))

# ==================== Save ====================
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
$bmp.Save($outPath, $jpegCodec, $ep)

$g.Dispose(); $bmp.Dispose()
Write-Output "Wrote: $outPath"
