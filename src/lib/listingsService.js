import { supabase } from "./supabase";

const LISTINGS_BUCKET = "listing-images";
const CONTRACTS_BUCKET = "listing-contracts";
const IMAGES_TABLE = "listing_image";
const IMAGE_URL_COL = "url";
const FULL_VIEW = "listings_full";

// ---------- URL resolution ----------

/**
 * Ensure an image URL is a full https:// URL.
 * Mobile app stores relative storage paths (e.g. "userId/photo.jpg").
 * Web upload stores full public URLs already.
 */
function resolveStorageUrl(rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  const { data } = supabase.storage.from(LISTINGS_BUCKET).getPublicUrl(rawUrl);
  return data?.publicUrl ?? null;
}

// ---------- shape conversion ----------

/** Map boolean flag columns in listings_full → friendly display labels. */
const AMENITY_LABELS = [
  ["has_aircon", "Air Conditioning"],
  ["has_refrigerator", "Refrigerator"],
  ["has_washing_machine", "Washing Machine"],
  ["has_water_heater", "Water Heater"],
  ["has_stove", "Stove"],
  ["has_cabinet", "Cabinet"],
  ["has_bed", "Bed"],
  ["has_balcony", "Balcony"],
  ["has_storage", "Storage"],
  ["has_natural_light", "Natural Light"],
  ["has_security", "Security"],
  ["has_elevator", "Elevator"],
  ["has_backup_power", "Backup Power"],
  ["has_pool", "Swimming Pool"],
  ["has_gym", "Gym"],
  ["has_laundry_area", "Laundry Area"],
  ["has_function_hall", "Function Hall"],
  ["has_playground", "Playground"],
  ["with_water", "Water Included"],
  ["with_electricity", "Electricity Included"],
  ["with_internet", "WiFi"],
  ["with_parking", "Parking"],
];

/** Reverse map: form amenity label → which sub-table/flag column it belongs to. */
const AMENITY_TO_FLAG = {
  "Air Conditioning":    ["listing_amenities", "has_aircon"],
  "Refrigerator":        ["listing_amenities", "has_refrigerator"],
  "Washing Machine":     ["listing_amenities", "has_washing_machine"],
  "Water Heater":        ["listing_amenities", "has_water_heater"],
  "Stove":               ["listing_amenities", "has_stove"],
  "Cabinet":             ["listing_amenities", "has_cabinet"],
  "Bed":                 ["listing_amenities", "has_bed"],
  "Balcony":             ["listing_details", "has_balcony"],
  "Storage":             ["listing_details", "has_storage"],
  "Natural Light":       ["listing_details", "has_natural_light"],
  "Security":            ["listing_building_features", "has_security"],
  "CCTV":                ["listing_building_features", "has_security"],
  "Elevator":            ["listing_building_features", "has_elevator"],
  "Backup Power":        ["listing_building_features", "has_backup_power"],
  "Swimming Pool":       ["listing_building_features", "has_pool"],
  "Gym":                 ["listing_building_features", "has_gym"],
  "Laundry Area":        ["listing_building_features", "has_laundry_area"],
  "Function Hall":       ["listing_building_features", "has_function_hall"],
  "Playground":          ["listing_building_features", "has_playground"],
  "WiFi":                ["listing_utilities", "with_internet"],
  "Water Included":      ["listing_utilities", "with_water"],
  "Electricity Included":["listing_utilities", "with_electricity"],
  "Parking":             ["listing_utilities", "with_parking"],
};

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function safeNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function safeInt(v) {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function boolsToAmenities(row) {
  const out = [];
  for (const [col, label] of AMENITY_LABELS) {
    if (row[col]) out.push(label);
  }
  if (row.other_appliances) out.push(row.other_appliances);
  return out;
}

/** Normalize a row from listings_full (+ joined images) into the UI shape. */
export function normalizeListing(row) {
  if (!row) return null;

  const joinedImages = Array.isArray(row.listing_image)
    ? [...row.listing_image].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];
  const galleryUrls = joinedImages.map((i) => resolveStorageUrl(i.url)).filter(Boolean);

  const explicitCover = joinedImages.find((i) => i.is_cover)
    ? resolveStorageUrl(joinedImages.find((i) => i.is_cover).url)
    : null;
  // listings.cover_photo_url is the single source of truth — it's what
  // create/update writes. listing_image.is_cover is a stale fallback.
  const cover = resolveStorageUrl(row.cover_photo_url)
    || explicitCover
    || galleryUrls[0]
    || null;

  // Normal-only list for the carousel lightbox (excludes panorama/360)
  const normalRecords = joinedImages.filter((i) => (i.type ?? "normal") !== "panorama");
  const normalImages = normalRecords.map((i) => resolveStorageUrl(i.url)).filter(Boolean);

  const images = [];
  if (cover) images.push(cover);
  for (const url of galleryUrls) {
    if (url && !images.includes(url)) images.push(url);
  }
  const resolvedCoverPhotoUrl = resolveStorageUrl(row.cover_photo_url);
  if (resolvedCoverPhotoUrl && !images.includes(resolvedCoverPhotoUrl)) {
    images.push(resolvedCoverPhotoUrl);
  }

  const location =
    [row.barangay, row.city].filter(Boolean).join(", ") ||
    row.full_address ||
    "";

  const amenities = boolsToAmenities(row);

  return {
    id: row.id,
    title: row.title ?? "Untitled listing",
    description: row.description ?? null,
    type: row.property_type
      ? `${capitalize(row.property_type)}${row.city ? ` · ${row.city}` : ""}`
      : "Property",
    propertyType: row.property_type,
    listingType: row.listing_type ?? "lease",

    // Pricing (from listing_financials)
    monthlyRent: safeNum(row.monthly_rent),
    price: row.monthly_rent != null
      ? `₱${Number(row.monthly_rent).toLocaleString()}`
      : null,
    securityDeposit: safeNum(row.security_deposit),
    advancePayment: safeNum(row.advance_payment),
    paymentTerms: row.payment_terms ?? null,
    paymentMethod: row.payment_method ?? null,
    associationDues: safeNum(row.association_dues),
    duesIncluded: !!row.dues_included_in_rent,

    // Details (from listing_details; bedrooms/bathrooms are text in DB)
    bedrooms: safeInt(row.bedrooms),
    bathrooms: safeInt(row.bathrooms),
    bedroomsRaw: row.bedrooms ?? null,
    bathroomsRaw: row.bathrooms ?? null,
    area: safeNum(row.square_meters),
    squareMeters: safeNum(row.square_meters),
    maxOccupants: safeInt(row.max_occupants),
    furnishing: row.furnishing ?? null,
    flooringType: row.flooring_type ?? null,
    floorNumber: safeInt(row.floor_number),
    totalFloors: safeInt(row.total_floors),
    yearBuilt: safeInt(row.year_built),

    // Location (from listing_locations)
    location,
    address: row.full_address ?? null,
    fullAddress: row.full_address ?? [row.barangay, row.city, row.province].filter(Boolean).join(", "),
    city: row.city ?? null,
    barangay: row.barangay ?? null,
    province: row.province ?? null,
    postalCode: row.postal_code ?? null,
    nearbyLandmarks: row.nearby_landmarks ?? null,
    latitude: safeNum(row.latitude),
    longitude: safeNum(row.longitude),

    // Images
    cover,
    img: cover,
    images,
    normalImages,
    panoramaImages: joinedImages.filter((i) => i.type === "panorama").map((i) => i.url).filter(Boolean),
    imageRecords: joinedImages,

    // Amenities (display array + raw flags)
    amenities,
    flags: {
      has_aircon: !!row.has_aircon,
      has_refrigerator: !!row.has_refrigerator,
      has_washing_machine: !!row.has_washing_machine,
      has_water_heater: !!row.has_water_heater,
      has_stove: !!row.has_stove,
      has_cabinet: !!row.has_cabinet,
      has_bed: !!row.has_bed,
      has_balcony: !!row.has_balcony,
      has_storage: !!row.has_storage,
      has_natural_light: !!row.has_natural_light,
      has_security: !!row.has_security,
      has_elevator: !!row.has_elevator,
      has_backup_power: !!row.has_backup_power,
      has_pool: !!row.has_pool,
      has_gym: !!row.has_gym,
      has_laundry_area: !!row.has_laundry_area,
      has_function_hall: !!row.has_function_hall,
      has_playground: !!row.has_playground,
      with_water: !!row.with_water,
      with_electricity: !!row.with_electricity,
      with_internet: !!row.with_internet,
      with_parking: !!row.with_parking,
    },
    parkingType: row.parking_type ?? null,
    parkingFee: safeNum(row.parking_fee),

    // Availability (from listing_availability)
    isImmediate: !!row.is_immediate,
    availability: row.is_immediate ? "immediate" : "future",
    availableFrom: row.available_from ?? null,
    leaseTerm: row.lease_term ?? null,
    earlyTerminationFee: safeNum(row.early_termination_fee),
    renewable: row.renewable ?? null,

    // Policies (from listing_policies) — expose both raw booleans and display labels
    petsAllowed: !!row.pets_allowed,
    petPolicy: row.pets_allowed ? "Pets Allowed" : "No Pets",
    smokingAllowed: !!row.smoking_allowed,
    smokingPolicy: row.smoking_allowed ? "Yes" : "No",
    noCurfew: row.no_curfew !== false,
    curfew: row.no_curfew === false ? "With Curfew" : "No Curfew",
    guestPolicy: row.guest_policy ?? null,
    sublettingAllowed:   !!row.subletting_allowed,
    modificationAllowed: !!row.modification_allowed,

    // Requirements (from listing_requirements)
    requiresProofOfIncome: !!row.requires_proof_of_income,
    requiresEmploymentCert: !!row.requires_employment_cert,
    requiresValidId: !!row.requires_valid_id,
    requiresReferences: !!row.requires_references,

    // Host (from listing_host_info)
    hostName: row.host_name ?? null,
    hostRole: row.host_role ?? null,
    responseTime: row.response_time ?? null,

    // Display-only extras the UI expects
    aboutPlace: row.description ?? null,
    unitDetails: null,

    rating: 0, // not in schema
    reviews: 0,
    status: row.status ?? "active",
    isVerified: !!row.is_verified,
    ownerId: row.landlord_id ?? null,
    createdAt: row.created_at ?? null,
  };
}

// ---------- fetching ----------

async function attachImages(listings) {
  if (!listings || listings.length === 0) return listings ?? [];
  const ids = listings.map((l) => l.id);

  const { data, error } = await supabase
    .from("listing_image")
    .select("id, listing_id, url, is_cover, sort_order, type, upload_source")
    .in("listing_id", ids);

  if (error) {
    console.warn("listing_image fetch:", error.message);
    return listings.map((l) => ({ ...l, listing_image: [] }));
  }

  const byId = new Map();
  for (const img of data ?? []) {
    if (!byId.has(img.listing_id)) byId.set(img.listing_id, []);
    byId.get(img.listing_id).push(img);
  }

  return listings.map((l) => ({
    ...l,
    listing_image: (byId.get(l.id) ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

export async function fetchListings(options = {}) {
  const { limit, orderBy = "created_at", ascending = false } = options;

  let query = supabase
    .from(FULL_VIEW)
    .select("*")
    .eq("status", "active")
    .order(orderBy, { ascending });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { data: [], error };

  const withImages = await attachImages(data ?? []);
  return { data: withImages.map(normalizeListing), error: null };
}

/**
 * Fetch a batch of listings by id, returning normalized rows in the same
 * order as the input ids. Listings that no longer exist are filtered out.
 * Used by the wishlist module to hydrate bookmarked listing IDs.
 */
export async function fetchListingsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from(FULL_VIEW)
    .select("*")
    .in("id", ids);
  if (error) return { data: [], error };

  const withImages = await attachImages(data ?? []);
  const byId = new Map(withImages.map((r) => [r.id, normalizeListing(r)]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  return { data: ordered, error: null };
}

export async function fetchListingById(id) {
  const { data, error } = await supabase
    .from(FULL_VIEW)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };

  // Contract-template columns aren't in the listings_full view — pull them
  // from the base listings table so the form can edit them.
  const { data: contractRow } = await supabase
    .from("listings")
    .select("contract_template_url, contract_template_name, terms_override")
    .eq("id", id)
    .maybeSingle();

  const [withImages] = await attachImages([data]);
  const normalized = normalizeListing(withImages);
  return {
    data: {
      ...normalized,
      contractTemplateUrl:  contractRow?.contract_template_url  ?? null,
      contractTemplateName: contractRow?.contract_template_name ?? null,
      termsOverride:        contractRow?.terms_override         ?? null,
    },
    error: null,
  };
}

export async function fetchMyListings(ownerId) {
  if (!ownerId) return { data: [], error: new Error("Not signed in") };
  const { data, error } = await supabase
    .from(FULL_VIEW)
    .select("*")
    .eq("landlord_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };

  const withImages = await attachImages(data ?? []);
  return { data: withImages.map(normalizeListing), error: null };
}

// ---------- writing ----------

function nonEmpty(v) {
  return v == null || v === "" ? null : v;
}

function amenitiesToFlagTables(amenitiesList) {
  const tables = {
    listing_amenities: {},
    listing_details: {},
    listing_building_features: {},
    listing_utilities: {},
  };
  for (const label of amenitiesList || []) {
    const entry = AMENITY_TO_FLAG[label];
    if (!entry) continue;
    const [table, col] = entry;
    tables[table][col] = true;
  }
  return tables;
}

async function upsertSatellite(table, listingId, values) {
  const row = { listing_id: listingId, ...values };
  const { error } = await supabase
    .from(table)
    .upsert(row, { onConflict: "listing_id" });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function writeSatelliteTables(listingId, p) {
  const flags = amenitiesToFlagTables(p.amenities);

  // 1. Location
  if ([p.address, p.barangay, p.city, p.province, p.postalCode, p.nearbyLandmarks, p.latitude, p.longitude]
      .some((v) => v !== undefined && v !== "")) {
    const fullAddress = [p.address, p.barangay, p.city, p.province].filter(Boolean).join(", ") || null;
    await upsertSatellite("listing_locations", listingId, {
      full_address: fullAddress || nonEmpty(p.address),
      barangay: nonEmpty(p.barangay),
      city: nonEmpty(p.city),
      province: nonEmpty(p.province),
      postal_code: nonEmpty(p.postalCode),
      nearby_landmarks: nonEmpty(p.nearbyLandmarks),
      latitude: safeNum(p.latitude),
      longitude: safeNum(p.longitude),
    });
  }

  // 2. Details (+ structural amenity flags)
  const hasDetails = [p.bedrooms, p.bathrooms, p.maxOccupants, p.area, p.furnishing, p.floorNumber, p.totalFloors, p.yearBuilt].some((v) => v !== undefined && v !== "");
  if (hasDetails || Object.keys(flags.listing_details).length > 0) {
    await upsertSatellite("listing_details", listingId, {
      bedrooms: p.bedrooms != null && p.bedrooms !== "" ? String(p.bedrooms) : null,
      bathrooms: p.bathrooms != null && p.bathrooms !== "" ? String(p.bathrooms) : null,
      max_occupants: safeInt(p.maxOccupants),
      square_meters: safeNum(p.area),
      furnishing: nonEmpty(p.furnishing),
      flooring_type: nonEmpty(p.flooringType),
      floor_number: safeInt(p.floorNumber),
      total_floors: safeInt(p.totalFloors),
      year_built: safeInt(p.yearBuilt),
      has_balcony: !!flags.listing_details.has_balcony,
      has_storage: !!flags.listing_details.has_storage,
      has_natural_light: !!flags.listing_details.has_natural_light,
    });
  }

  // 3. Appliance amenities
  if (Object.keys(flags.listing_amenities).length > 0) {
    await upsertSatellite("listing_amenities", listingId, {
      has_aircon: !!flags.listing_amenities.has_aircon,
      has_refrigerator: !!flags.listing_amenities.has_refrigerator,
      has_washing_machine: !!flags.listing_amenities.has_washing_machine,
      has_water_heater: !!flags.listing_amenities.has_water_heater,
      has_stove: !!flags.listing_amenities.has_stove,
      has_cabinet: !!flags.listing_amenities.has_cabinet,
      has_bed: !!flags.listing_amenities.has_bed,
    });
  }

  // 4. Utilities
  if (Object.keys(flags.listing_utilities).length > 0) {
    await upsertSatellite("listing_utilities", listingId, {
      with_water: !!flags.listing_utilities.with_water,
      with_electricity: !!flags.listing_utilities.with_electricity,
      with_internet: !!flags.listing_utilities.with_internet,
      with_parking: !!flags.listing_utilities.with_parking,
    });
  }

  // 5. Building features
  if (Object.keys(flags.listing_building_features).length > 0) {
    await upsertSatellite("listing_building_features", listingId, {
      has_security: !!flags.listing_building_features.has_security,
      has_elevator: !!flags.listing_building_features.has_elevator,
      has_backup_power: !!flags.listing_building_features.has_backup_power,
      has_pool: !!flags.listing_building_features.has_pool,
      has_gym: !!flags.listing_building_features.has_gym,
      has_laundry_area: !!flags.listing_building_features.has_laundry_area,
      has_function_hall: !!flags.listing_building_features.has_function_hall,
      has_playground: !!flags.listing_building_features.has_playground,
    });
  }

  // 6. Financials
  if ([p.monthlyRent, p.securityDeposit, p.advancePayment, p.paymentTerms, p.paymentMethod].some((v) => v !== undefined && v !== "")) {
    await upsertSatellite("listing_financials", listingId, {
      monthly_rent: safeNum(p.monthlyRent),
      security_deposit: safeNum(p.securityDeposit),
      advance_payment: safeNum(p.advancePayment),
      payment_terms: nonEmpty(p.paymentTerms),
      payment_method: nonEmpty(p.paymentMethod),
    });
  }

  // 7. Availability
  if ([p.availability, p.availableFrom, p.leaseTerm].some((v) => v !== undefined && v !== "")) {
    await upsertSatellite("listing_availability", listingId, {
      is_immediate: p.availability === "immediate" || p.availability === true,
      available_from: p.availableFrom || null,
      lease_term: p.leaseTerm != null && p.leaseTerm !== "" ? String(p.leaseTerm) : null,
    });
  }

  // 8. Policies — "No X" / "With Curfew" are falsey; anything else is truthy.
  // subletting/modifications are explicit booleans on the form so we always
  // forward them when present.
  const hasPolicySignal = [
    p.petPolicy, p.smokingPolicy, p.curfew, p.guestPolicy,
    p.sublettingAllowed, p.modificationAllowed,
  ].some((v) => v !== undefined && v !== "");
  if (hasPolicySignal) {
    await upsertSatellite("listing_policies", listingId, {
      pets_allowed: typeof p.petPolicy === "string" ? !/^no/i.test(p.petPolicy) : !!p.petsAllowed,
      smoking_allowed: typeof p.smokingPolicy === "string" ? !/^no/i.test(p.smokingPolicy) : !!p.smokingAllowed,
      no_curfew: typeof p.curfew === "string" ? !/with/i.test(p.curfew) : true,
      guest_policy: nonEmpty(p.guestPolicy),
      subletting_allowed:   !!p.sublettingAllowed,
      modification_allowed: !!p.modificationAllowed,
    });
  }

  // 9. Host info
  if ([p.hostName, p.hostRole, p.responseTime].some((v) => v !== undefined && v !== "")) {
    await upsertSatellite("listing_host_info", listingId, {
      host_name: nonEmpty(p.hostName),
      host_role: nonEmpty(p.hostRole),
      response_time: nonEmpty(p.responseTime),
    });
  }
}

export async function createListing(payload) {
  const base = {
    title: payload.title,
    description: payload.description ?? payload.aboutPlace ?? null,
    property_type: payload.propertyType ?? null,
    listing_type: payload.listingType ?? "lease",
    status: payload.status ?? "active",
    cover_photo_url: payload.cover ?? null,
    landlord_id: payload.ownerId,
    // Custom contract template the landlord uploaded on this form.
    // updateListing() persists these on edit; without writing them on
    // insert, the file lives in storage but listings.contract_template_url
    // stays NULL — so ContractView falls back to the default template.
    contract_template_url:  payload.contractTemplateUrl  ?? null,
    contract_template_name: payload.contractTemplateName ?? null,
    terms_override:         payload.termsOverride        ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("listings")
    .insert(base)
    .select("id")
    .single();
  if (error) return { data: null, error };

  const listingId = inserted.id;

  try {
    await writeSatelliteTables(listingId, payload);
  } catch (err) {
    return { data: null, error: err };
  }

  return { data: { id: listingId }, error: null };
}

export async function updateListing(id, patch) {
  const baseUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) baseUpdate.title = patch.title;
  if (patch.description !== undefined || patch.aboutPlace !== undefined) {
    baseUpdate.description = patch.description ?? patch.aboutPlace ?? null;
  }
  if (patch.propertyType !== undefined) baseUpdate.property_type = patch.propertyType;
  if (patch.listingType !== undefined) baseUpdate.listing_type = patch.listingType;
  if (patch.status !== undefined) baseUpdate.status = patch.status;
  if (patch.cover !== undefined) baseUpdate.cover_photo_url = patch.cover;
  if (patch.contractTemplateUrl !== undefined)  baseUpdate.contract_template_url  = patch.contractTemplateUrl;
  if (patch.contractTemplateName !== undefined) baseUpdate.contract_template_name = patch.contractTemplateName;
  if (patch.termsOverride !== undefined)        baseUpdate.terms_override         = patch.termsOverride;

  if (Object.keys(baseUpdate).length > 1) {
    const { error } = await supabase.from("listings").update(baseUpdate).eq("id", id);
    if (error) return { data: null, error };
  }

  try {
    await writeSatelliteTables(id, patch);
  } catch (err) {
    return { data: null, error: err };
  }

  return { data: { id }, error: null };
}

export async function deleteListingById(id) {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  return { error };
}

export async function fetchHostProfile(userId) {
  if (!userId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_landlord, is_verified")
    .eq("id", userId)
    .maybeSingle();
  return { data: data ?? null, error };
}

// ---------- image storage + records ----------

export async function uploadListingImages(ownerId, files) {
  if (!ownerId) throw new Error("Missing ownerId");
  if (!files || files.length === 0) return [];

  const uploaded = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(LISTINGS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from(LISTINGS_BUCKET)
      .getPublicUrl(path);
    uploaded.push(publicData.publicUrl);
  }
  return uploaded;
}

export async function saveListingImageRecords({
  listingId,
  urls,
  uploadedBy,
  coverUrl,
  startingSortOrder = 0,
}) {
  if (!listingId || !urls || urls.length === 0) return { data: [], error: null };

  const rows = urls.map((url, i) => ({
    listing_id: listingId,
    url,
    type: "normal",
    upload_source: "upload",
    sort_order: startingSortOrder + i,
    is_cover: coverUrl ? url === coverUrl : i === 0 && startingSortOrder === 0,
    uploaded_by: uploadedBy ?? null,
  }));

  const { data, error } = await supabase
    .from(IMAGES_TABLE)
    .insert(rows)
    .select("*");
  return { data: data ?? [], error };
}

export async function deleteListingImageRecord(recordId, url) {
  const { error: dbError } = await supabase
    .from(IMAGES_TABLE)
    .delete()
    .eq("id", recordId);
  if (dbError) return { error: dbError };

  if (url) await deleteListingImage(url);
  return { error: null };
}

export async function deleteListingImage(publicUrl) {
  const marker = `/storage/v1/object/public/${LISTINGS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return { error: null };
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  const { error } = await supabase.storage.from(LISTINGS_BUCKET).remove([path]);
  return { error };
}

// ---------- contract template storage ----------

/**
 * Upload a landlord-supplied contract file (e.g. PDF/DOCX) to the private
 * `listing-contracts` bucket. Returns the storage path which the caller
 * persists to listings.contract_template_url.
 */
export async function uploadContractTemplate(ownerId, file) {
  if (!ownerId) throw new Error("Missing ownerId");
  if (!file) throw new Error("No file selected");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  return { path, name: file.name };
}

/** Remove a previously uploaded contract template from storage. */
export async function deleteContractTemplate(path) {
  if (!path) return { error: null };
  const { error } = await supabase.storage.from(CONTRACTS_BUCKET).remove([path]);
  return { error };
}

/**
 * Generate a short-lived signed URL so the owner can preview / download
 * the uploaded contract from the private bucket.
 */
export async function getContractTemplateSignedUrl(path, expiresInSec = 3600) {
  if (!path) return { url: null, error: null };
  const { data, error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(path, expiresInSec);
  return { url: data?.signedUrl ?? null, error };
}
