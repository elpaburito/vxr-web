Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$outPath = Join-Path $PSScriptRoot "..\VXR_DFD_Explanation_Script.docx"
if (Test-Path $outPath) { Remove-Item $outPath -Force }

# ---------------- DOCX content authoring ----------------
function H1($text) { return "<w:p><w:pPr><w:pStyle w:val=""Heading1""/></w:pPr><w:r><w:t xml:space=""preserve"">$([System.Security.SecurityElement]::Escape($text))</w:t></w:r></w:p>" }
function H2($text) { return "<w:p><w:pPr><w:pStyle w:val=""Heading2""/></w:pPr><w:r><w:t xml:space=""preserve"">$([System.Security.SecurityElement]::Escape($text))</w:t></w:r></w:p>" }
function H3($text) { return "<w:p><w:pPr><w:pStyle w:val=""Heading3""/></w:pPr><w:r><w:t xml:space=""preserve"">$([System.Security.SecurityElement]::Escape($text))</w:t></w:r></w:p>" }
function Para($text) { return "<w:p><w:r><w:t xml:space=""preserve"">$([System.Security.SecurityElement]::Escape($text))</w:t></w:r></w:p>" }
function Bold($text) { return "<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space=""preserve"">$([System.Security.SecurityElement]::Escape($text))</w:t></w:r></w:p>" }
function Bullet($text) {
  return "<w:p><w:pPr><w:pStyle w:val=""ListBullet""/><w:numPr><w:ilvl w:val=""0""/><w:numId w:val=""1""/></w:numPr></w:pPr><w:r><w:t xml:space=""preserve"">$([System.Security.SecurityElement]::Escape($text))</w:t></w:r></w:p>"
}
function LabelLine($label, $rest) {
  $l = [System.Security.SecurityElement]::Escape($label)
  $r = [System.Security.SecurityElement]::Escape($rest)
  return "<w:p><w:pPr><w:pStyle w:val=""ListBullet""/><w:numPr><w:ilvl w:val=""0""/><w:numId w:val=""1""/></w:numPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space=""preserve"">$l</w:t></w:r><w:r><w:t xml:space=""preserve""> $r</w:t></w:r></w:p>"
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append((H1 "VXR Rental Web Application - Data Flow Diagram Explanation Script"))
[void]$sb.Append((Para "This document is the narration/explanation script that accompanies the Data Flow Diagram (DFD) image (VXR_DataFlowDiagram.jpeg). It walks the reader through the system context (Level 0) and the detailed processes, data stores, external entities, and data flows (Level 1) of the VXR rental web application."))

# ---- 1. Overview ----
[void]$sb.Append((H2 "1. Application Overview"))
[void]$sb.Append((Para "VXR is a rental marketplace web application that connects tenants and landlords. It is built as a single-page React application (Vite + React Router) and is backed by Supabase, which provides authentication, a PostgreSQL database, file storage, and serverless Edge Functions. Online payments are handled through PayMongo (with Stripe as an alternate card processor). Location data uses Google Maps and the Philippine Standard Geographic Code (PSGC) API."))
[void]$sb.Append((Para "The web app supports three classes of users:"))
[void]$sb.Append((Bullet "Tenant - searches listings, applies for a unit, signs a contract, pays rent, chats, and reports maintenance issues."))
[void]$sb.Append((Bullet "Landlord - publishes listings, reviews applications, issues contracts, manages active tenants, records offline payments, and resolves reports."))
[void]$sb.Append((Bullet "Admin - verifies user identities (KYC), moderates listings, manages CMS content, and reviews audit logs."))

# ---- 2. Context Diagram (Level 0) ----
[void]$sb.Append((H2 "2. Context Diagram (Level 0)"))
[void]$sb.Append((Para "The Level 0 diagram treats the entire VXR web application as a single process (Process 0) and shows only the flows between that process and the outside world. The goal of the context diagram is to define the scope and external interfaces of the system."))
[void]$sb.Append((H3 "2.1 External Entities (Level 0)"))
[void]$sb.Append((LabelLine "Tenant:" "Sends browse, apply, pay, and chat requests; receives listings, contracts, receipts, and alerts."))
[void]$sb.Append((LabelLine "Landlord:" "Sends listing data, application decisions, and tenant management actions; receives applications, payment status, and messages."))
[void]$sb.Append((LabelLine "Admin:" "Sends verification decisions, moderation actions, and CMS updates; receives audit logs, KYC queue items, and CMS state."))
[void]$sb.Append((LabelLine "PayMongo Gateway:" "Receives PaymentIntent creation and method-attach calls; sends back webhooks indicating that a payment succeeded or failed."))
[void]$sb.Append((LabelLine "Stripe Gateway:" "Alternate card processor; receives tokenized card data."))
[void]$sb.Append((LabelLine "Google Maps API:" "Provides geocoding and map tiles for listing addresses."))
[void]$sb.Append((LabelLine "PSGC API:" "Supplies Philippine region/city/barangay reference data for address pickers."))
[void]$sb.Append((LabelLine "Supabase (Auth + DB + Storage + Edge Functions):" "The backing platform - the web app reads and writes data via Supabase SQL, authenticates through Supabase Auth, stores files in Supabase Storage, and invokes server logic through Supabase Edge Functions."))

# ---- 3. Level 1 ----
[void]$sb.Append((H2 "3. Detailed DFD (Level 1)"))
[void]$sb.Append((Para "The Level 1 diagram decomposes Process 0 into twelve subprocesses (1.0 - 12.0). Each subprocess has its own responsibilities, reads and writes specific data stores, and may exchange data with external entities or with other subprocesses."))

# ---- 3.1 Processes ----
[void]$sb.Append((H3 "3.1 Processes"))

[void]$sb.Append((Bold "Process 1.0 - Auth / Profile Management"))
[void]$sb.Append((Para "Handles sign up, login, and profile editing for tenants, landlords, and admins. Credentials are validated through Supabase Auth; profile fields are persisted to the profile table. When the user uploads identity documents or a selfie, the data is forwarded to the verification (KYC) store for later admin review."))

[void]$sb.Append((Bold "Process 2.0 - Listing & Search Management"))
[void]$sb.Append((Para "Landlords create and edit listings; tenants browse and filter them. Listing rows are written to the listing table (and read through the listings_full view). Image references are stored in listing_image, while the binary image files travel through Process 12.0 (Media & Document Storage) into the listing-images Supabase bucket. Address resolution and map tiles come from Google Maps; region, city, and barangay options come from the PSGC API."))

[void]$sb.Append((Bold "Process 3.0 - Wishlist Management"))
[void]$sb.Append((Para "Lets tenants save and remove listings they are interested in. Each save inserts (or deletes) a row in the bookmark store. The wishlist screen reads listing summaries from the same path used by Process 2.0."))

[void]$sb.Append((Bold "Process 4.0 - Application Processing"))
[void]$sb.Append((Para "When a tenant applies for a unit, this process re-checks listing verification server-side, inserts a row into application, and writes one row per supporting document into application_document. The actual document files (valid ID, proof of income) are uploaded through Process 12.0 into the application-documents bucket. Landlords use the same process to approve or reject applications."))

[void]$sb.Append((Bold "Process 5.0 - Contract Management"))
[void]$sb.Append((Para "Once a landlord approves an application, this process creates a contract record. The tenant accepts or signs the contract from their dashboard. Signed contract PDFs are stored in the listing-contracts bucket via Process 12.0."))

[void]$sb.Append((Bold "Process 6.0 - Payment Processing"))
[void]$sb.Append((Para "Drives the online payment flow. The browser asks the paymongo-create-payment-intent Edge Function for a PaymentIntent (amount and tenant authorization are enforced server-side). The chosen payment method is attached through paymongo-attach-payment-method. PayMongo eventually calls the paymongo-webhook function to confirm success or failure, and the result is written into the payment store. Saved cards/e-wallets are tracked in payment_method. Landlords can also record offline payments through the landlord-record-offline-payment function."))

[void]$sb.Append((Bold "Process 7.0 - Messaging"))
[void]$sb.Append((Para "Two-way chat between tenants and landlords. Conversation and message rows are written into the conversation/message store and read back in real time on both client devices."))

[void]$sb.Append((Bold "Process 8.0 - Tenant / In-Stay Management"))
[void]$sb.Append((Para "Shows the in-stay dashboard for the tenant and the tenant overview for the landlord. It reads active contracts and writes any move-out checklist progress into move_out_checklist."))

[void]$sb.Append((Bold "Process 9.0 - Reports / Maintenance"))
[void]$sb.Append((Para "Tenants submit maintenance issues; landlords update status (open, in progress, resolved). Records are persisted in maintenance_report. Status changes also trigger notifications through Process 10.0."))

[void]$sb.Append((Bold "Process 10.0 - Notifications"))
[void]$sb.Append((Para "Central fan-in for events. Application status changes, payment events, new chat messages, and report updates all push entries into the notification store, which is then read by the NotificationContext and surfaced to tenants and landlords as alerts."))

[void]$sb.Append((Bold "Process 11.0 - Admin Verification & CMS"))
[void]$sb.Append((Para "Admin-only process. Reviews KYC submissions (writing decisions back into verification), moderates listings, edits CMS content (homepage banners, hero text), and writes audit entries into admin_user/audit_log."))

[void]$sb.Append((Bold "Process 12.0 - Media & Document Storage"))
[void]$sb.Append((Para "Shared service used by Processes 2.0, 4.0, and 5.0. It uploads files to the appropriate Supabase Storage bucket (listing-images, application-documents, listing-contracts) and returns either a public URL or a private storage path, which is then written into the relevant table by the calling process."))

# ---- 3.2 Data stores ----
[void]$sb.Append((H3 "3.2 Data Stores"))
[void]$sb.Append((LabelLine "D1 - profile:" "User profile records (linked to Supabase Auth user IDs)."))
[void]$sb.Append((LabelLine "D2 - listing / listings_full:" "Listing rows and a denormalized view for fast browsing."))
[void]$sb.Append((LabelLine "D3 - listing_image:" "Image URL/path rows per listing."))
[void]$sb.Append((LabelLine "D4 - bookmark:" "Tenant wishlist entries."))
[void]$sb.Append((LabelLine "D5 - application:" "Rental application rows."))
[void]$sb.Append((LabelLine "D6 - application_document:" "Document references attached to an application."))
[void]$sb.Append((LabelLine "D7 - contract:" "Rental contracts between landlord and tenant."))
[void]$sb.Append((LabelLine "D8 - payment:" "Each successful or failed payment attempt, including PayMongo PaymentIntent IDs."))
[void]$sb.Append((LabelLine "D9 - payment_method:" "Saved cards and e-wallets per user."))
[void]$sb.Append((LabelLine "D10 - conversation / message:" "Chat threads and individual messages."))
[void]$sb.Append((LabelLine "D11 - notification:" "In-app alerts shown to users."))
[void]$sb.Append((LabelLine "D12 - maintenance_report:" "Reported issues and their status history."))
[void]$sb.Append((LabelLine "D13 - verification (KYC):" "Identity documents and AI/admin verification status."))
[void]$sb.Append((LabelLine "D14 - admin_user / audit_log:" "Admin accounts and an append-only audit trail."))
[void]$sb.Append((LabelLine "D15 - move_out_checklist:" "Per-contract move-out task state."))
[void]$sb.Append((LabelLine "D16 - cms_content:" "Editable homepage / marketing content."))
[void]$sb.Append((LabelLine "D17 - Supabase Storage Buckets:" "Binary objects - listing-images, application-documents, listing-contracts."))

# ---- 3.3 Key data flows ----
[void]$sb.Append((H3 "3.3 Key Data Flows to Highlight in the Walkthrough"))
[void]$sb.Append((Bullet "Tenant -> 2.0 Listing & Search: search filters; 2.0 returns listing summaries pulled from D2 and image URLs resolved via D17."))
[void]$sb.Append((Bullet "Tenant -> 4.0 Application Processing: form data + documents; 4.0 writes to D5 and D6 and triggers 10.0 to notify the landlord."))
[void]$sb.Append((Bullet "Landlord -> 5.0 Contract Management: contract terms; 5.0 writes D7 and (via 12.0) stores the signed PDF in the listing-contracts bucket."))
[void]$sb.Append((Bullet "Tenant -> 6.0 Payment Processing -> PayMongo: createPaymongoPaymentIntent -> attachPaymentMethod. PayMongo -> 6.0 webhook updates D8 and triggers 10.0 to notify the landlord."))
[void]$sb.Append((Bullet "Tenant <-> 7.0 Messaging <-> Landlord: bidirectional chat; each new message writes D10 and pushes a notification via 10.0."))
[void]$sb.Append((Bullet "Admin -> 11.0 Admin Verification & CMS: KYC decisions update D13; CMS edits update D16; every admin action is appended to D14."))

# ---- 4. Narration script ----
[void]$sb.Append((H2 "4. Suggested Narration Script (for Presentations)"))
[void]$sb.Append((Para "Use the following talking points when walking an audience through the diagram. The script is written so that each paragraph corresponds to one section of the JPEG."))

[void]$sb.Append((Bold "Opening (Context Diagram)"))
[void]$sb.Append((Para "What you see on top is the Level 0 or Context Diagram. The big bubble in the middle is the entire VXR Rental Web Application treated as a single process. On the left we have our three human actors - Tenant, Landlord, and Admin. On the right we have the external systems the web app talks to: PayMongo for online payments, Stripe as an alternate card processor, Google Maps for addresses and maps, the PSGC API for Philippine location data, and Supabase, which is our backend-as-a-service for authentication, the database, file storage, and serverless functions."))

[void]$sb.Append((Bold "Transition to Level 1"))
[void]$sb.Append((Para "Below the divider line, we zoom into Level 1. The same external entities appear on the sides, but now the single context bubble is decomposed into twelve numbered processes arranged in a 3x4 grid in the middle. Below the processes is the data layer - all of the Supabase tables and buckets the system reads from and writes to."))

[void]$sb.Append((Bold "Process-by-process tour"))
[void]$sb.Append((Para "Process 1.0 handles authentication and profile management. Users sign in through Supabase Auth and edit profile rows in D1. Identity documents go into D13 for the admin to review."))
[void]$sb.Append((Para "Process 2.0 is the listing engine. Landlords create units; tenants browse them. Listings live in D2, image references in D3, and the actual image files in D17 by way of Process 12.0."))
[void]$sb.Append((Para "Process 3.0 is the lightweight wishlist - one row per saved listing in D4."))
[void]$sb.Append((Para "Process 4.0 is application processing. The tenant submits an application with valid ID and proof of income. The application row lands in D5, documents in D6, and the binary files in the application-documents bucket through Process 12.0."))
[void]$sb.Append((Para "Process 5.0 handles contracts. Once approved, the landlord issues a contract that the tenant signs. The PDF is uploaded to the listing-contracts bucket."))
[void]$sb.Append((Para "Process 6.0 is the payment pipeline. The browser asks a Supabase Edge Function to create a PayMongo PaymentIntent, the user picks a payment method, and PayMongo eventually calls back with a webhook. We record success or failure in D8, save cards in D9, and notify the landlord via Process 10.0."))
[void]$sb.Append((Para "Process 7.0 is messaging - a two-way chat that writes to D10."))
[void]$sb.Append((Para "Process 8.0 is the tenant/in-stay dashboard. It shows the active contract and tracks the move-out checklist in D15."))
[void]$sb.Append((Para "Process 9.0 is maintenance reporting. Tenants log issues; landlords resolve them. Everything is stored in D12."))
[void]$sb.Append((Para "Process 10.0 is the central notification fan-in. Application changes, payments, messages, and reports all funnel here, the rows go into D11, and alerts go back out to tenants and landlords."))
[void]$sb.Append((Para "Process 11.0 is the admin surface - KYC review, listing moderation, and CMS editing. Every admin action is recorded in D14."))
[void]$sb.Append((Para "Process 12.0 is the shared media uploader. It is called by Processes 2.0, 4.0, and 5.0 and pushes binary files into the appropriate Supabase bucket."))

[void]$sb.Append((Bold "Closing"))
[void]$sb.Append((Para "Notice that no process talks directly to an external entity for data storage; all persistent state goes through Supabase. This keeps the access control rules (Row Level Security) and the audit trail in one place. The external gateways (PayMongo, Stripe, Google Maps, PSGC) are strictly request/response integrations driven by individual processes, not the whole system, which keeps the blast radius of any one integration small."))

# ---- 5. Notation ----
[void]$sb.Append((H2 "5. Notation Reference"))
[void]$sb.Append((Bullet "Rectangles = external entities (users or external systems)."))
[void]$sb.Append((Bullet "Rounded bubbles = processes, each with a numeric ID (1.0 - 12.0)."))
[void]$sb.Append((Bullet "Open-ended rectangles (Gane-Sarson) = data stores; ID and name are shown in the two compartments."))
[void]$sb.Append((Bullet "Arrows = data flows; the arrowhead points in the direction the data moves. Double arrows indicate two-way request/response flows."))

# ---- Document end ----
[void]$sb.Append((Para ""))
[void]$sb.Append((Para "End of document. Pair this narration with VXR_DataFlowDiagram.jpeg."))

$body = $sb.ToString()

# ---------------- DOCX skeleton files ----------------
$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    $body
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="280" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1F3864"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>
"@

$numberingXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="&#8226;"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>
"@

$contentTypesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
"@

$rootRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$docRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"@

# ---------------- Write ZIP ----------------
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$fs = [System.IO.File]::Open($outPath, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-Entry {
    param([string]$entryName, [string]$content)
    $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $es = $entry.Open()
    $sw = New-Object System.IO.StreamWriter($es, $utf8NoBom)
    $sw.Write($content)
    $sw.Flush()
    $sw.Dispose()
    $es.Dispose()
}

Add-Entry "[Content_Types].xml"          $contentTypesXml
Add-Entry "_rels/.rels"                  $rootRelsXml
Add-Entry "word/_rels/document.xml.rels" $docRelsXml
Add-Entry "word/document.xml"            $documentXml
Add-Entry "word/styles.xml"              $stylesXml
Add-Entry "word/numbering.xml"           $numberingXml

$zip.Dispose()
$fs.Dispose()
Write-Output "Wrote: $outPath"
