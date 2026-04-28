// Hardcoded mock data shared by EnlistmentApplications and the Contract module.
// Replace with Supabase queries when the backend is wired up.

export const SAMPLE_UNITS = [
  {
    id: "u1",
    title: "Modern Studio Apartment",
    beds: 1,
    baths: 1,
    size: "25m²",
    location: "Makati City, Metro Manila",
    address: "Unit 3B, Saber Tower, 12 Cityland Ave, Makati City",
    propertyType: "Studio",
    price: 4000,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
  },
  {
    id: "u2",
    title: "2 Floor Apartment",
    beds: 4,
    baths: 3,
    size: "85m²",
    location: "Makati City, Metro Manila",
    address: "House 21, Block 7, Bel-Air Village, Makati City",
    propertyType: "House",
    price: 4500,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80",
  },
  {
    id: "u3",
    title: "Deluxe Corner Unit",
    beds: 2,
    baths: 2,
    size: "45m²",
    location: "BGC, Taguig City",
    address: "Unit 22F, Verve Residences, BGC, Taguig City",
    propertyType: "Condo",
    price: 6200,
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  },
];

export const SAMPLE_APPLICANTS = [
  { id: "a1", unitId: "u1", name: "Juan Dela Cruz",  applied: "Feb 10, 2025", status: "pending" },
  { id: "a2", unitId: "u1", name: "Maria Santos",    applied: "Feb 10, 2025", status: "pending" },
  { id: "a3", unitId: "u1", name: "Pedro Reyes",     applied: "Feb 11, 2025", status: "approved" },
  { id: "a4", unitId: "u2", name: "Ana Gomez",       applied: "Feb 12, 2025", status: "approved" },
  { id: "a5", unitId: "u2", name: "Carlo Bautista",  applied: "Feb 09, 2025", status: "rejected" },
  { id: "a6", unitId: "u2", name: "Liza Torres",     applied: "Feb 08, 2025", status: "pending" },
  { id: "a7", unitId: "u3", name: "Roberto Villar",  applied: "Feb 13, 2025", status: "pending" },
  { id: "a8", unitId: "u3", name: "Isabel Aquino",   applied: "Feb 06, 2025", status: "rejected" },
];

export const SAMPLE_APPLICATION_DETAILS = {
  dob: "08/14/1995",
  email: "juandelacruz@email.com",
  phone: "(555) 123-4567",
  currentAddress: "456 Oak Street, Apt 2C, Springfield",
  employmentStatus: "Employed",
  jobTitle: "Software Engineer",
  company: "Tech Corp Inc.",
  monthlyIncome: "₱20,000",
  lengthOfEmployment: "3 years 2 months",
  workAddress: "Trece Martires City",
  previousAddress: "789 Pine Avenue, Springfield",
  reasonForLeaving: "Relocating for job",
  rentalDuration: "2 years 1 month",
  previousLandlord: "Juanito Jose Tinapa",
  landlordContact: "+63 912 345 6789",
  rentalReasonLeaving: "Lease ended",
  documents: [
    { name: "Valid ID (Front)", type: "image" },
    { name: "Valid ID (Back)",  type: "image" },
    { name: "Proof of Income",  type: "pdf" },
  ],
};

export const STATUS_STYLE = {
  pending:  { bg: "#FFF0E6", color: "#E07820", label: "Pending" },
  approved: { bg: "#E6F7EE", color: "#1A9E4A", label: "Approved" },
  rejected: { bg: "#FFECEC", color: "#D93636", label: "Rejected" },
};
