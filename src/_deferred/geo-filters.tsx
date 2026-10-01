"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// All Indian states and UTs with their codes
const STATES = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "DD", name: "Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "DN", name: "Dadra and Nagar Haveli" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LD", name: "Ladakh" },
  { code: "LK", name: "Lakshadweep" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "PY", name: "Puducherry" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TR", name: "Tripura" },
  { code: "TG", name: "Telangana" },
  { code: "UK", name: "Uttarakhand" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "WB", name: "West Bengal" },
];

// District names by state (sample — will be populated dynamically from DB)
const DISTRICTS_BY_STATE: Record<string, string[]> = {
  MH: [
    "Ahmednagar",
    "Akola",
    "Amravati",
    "Aurangabad",
    "Beed",
    "Bhandara",
    "Buldhana",
    "Chandrapur",
    "Dhule",
    "Gadchiroli",
    "Gondia",
    "Hingoli",
    "Jalgaon",
    "Jalna",
    "Kolhapur",
    "Latur",
    "Mumbai",
    "Nagpur",
    "Nanded",
    "Nandurbar",
    "Nashik",
    "Navi Mumbai",
    "Osmānābād",
    "Parbhani",
    "Pune",
    "Raigad",
    "Ratnagiri",
    "Sangli",
    "Satara",
    "Sindhudurg",
    "Solapur",
    "Thane",
    "Wardha",
    "Washim",
    "Yavatmal",
  ],
  DL: [
    "Central Delhi",
    "East Delhi",
    "New Delhi",
    "North Delhi",
    "South Delhi",
    "West Delhi",
  ],
  KA: [
    "Bagalkot",
    "Belgaum",
    "Bellary",
    "Bengaluru",
    "Bidar",
    "Bijapūr",
    "Chamrajnagar",
    "Chikballapur",
    "Chikmagalur",
    "Chitradurga",
    "Dakshina Kannada",
    "Davangere",
    "Dharwad",
    "Gadag",
    "Gulbarga",
    "Hassan",
    "Haveri",
    "Kodagu",
    "Kolar",
    "Kolār",
    "Koppal",
    "Mandya",
    "Mangalore",
    "Mysore",
    "Raichur",
    "Shimoga",
    "Tumkur",
    "Udupi",
    "Uttara Kannada",
    "Yadgir",
  ],
  TG: [
    "Adilabad",
    "Bheemini",
    "Hyderabad",
    "Jagtial",
    "Jangaon",
    "Jayashankhar Bhupalpally",
    "Jogulamba Gadwal",
    "Kamareddy",
    "Karimnagar",
    "Kasipet",
    "Khammam",
    "Komaram Bheem Asifabad",
    "Mahabubnagar",
    "Mahbubnagar",
    "Mancherial",
    "Medak",
    "Medchal",
    "Miryalaguda",
    "Nirmal",
    "Nizamabad",
    "Peddapalli",
    "Raidurg",
    "Rajanna Sircilla",
    "Sangareddy",
    "Siddipet",
    "Suryapet",
    "Tandur",
    "Vikarabad",
    "Wanaparthy",
    "Warangal",
    "Yadadri Bhuvanagiri",
  ],
  UP: [
    "Agra",
    "Aligarh",
    "Allahabad",
    "Ambedkar Nagar",
    "Amethi",
    "Amroha",
    "Auraiya",
    "Azamgarh",
    "Badaun",
    "Baghpat",
    "Bahraich",
    "Ballia",
    "Balrampur",
    "Banda",
    "Banswara",
    "Barabanki",
    "Bareilly",
    "Basti",
    "Bijnor",
    "Budaun",
    "Bulandshahr",
    "Chandauli",
    "Chhatarpur",
    "Chhindwara",
    "Chitrakoot",
    "Chikhalwadi",
    "Deoria",
    "Etah",
    "Etawah",
    "Faizabad",
    "Farrukhabad",
    "Fatehpur",
    "Firozabad",
    "Gajipur",
    "Ghaziabad",
    "Ghazni",
    "Gonda",
    "Gorakhpur",
    "Guna",
    "Guthiyani",
    "Gwalior",
    "Hardoi",
    "Hathras",
    "Hazaribag",
    "Hoshangabad",
    "Indore",
    "Ishanagar",
    "Jabalpurur",
    "Jalaun",
    "Jalna",
    "Jamshedpur",
    "Jaunpur",
    "Jehanabad",
    "Jhansi",
    "Jharkhand",
    "Jheel",
    "Jind",
    "Jodhpur",
    "Jyotiba Phule Nagar",
    "Kaimganj",
    "Kaithal",
    "Kanauj",
    "Kannauj",
    "Kanpur",
    "Kasganj",
    "Katni",
    "Kausambi",
    "Kawardha",
    "Keshod",
    "Khagaria",
    "Khammam",
    "Khandwa",
    "Khanna",
    "Kharar",
    "Kharsia",
    "Khatauli",
    "Khimsar",
    "Khindsi",
    "Khiron",
    "Khodad",
    "Kholaj",
    "Khopoli",
    "Khujan",
    "Khuldabad",
    "Khurd",
    "Khyber",
    "Kinwat",
    "Kipamganj",
    "Kirta",
    "Kishtwar",
    "Kistna",
    "Kohatu",
    "Kohima",
    "Koilkonda",
    "Kokand",
    "Kokarighat",
    "Kokgarh",
    "Kokji",
    "Kokhraj",
    "Kokmhadi",
    "Koktajpur",
    "Kolar",
    "Kolayat",
    "Kolhapur",
    "Koli",
    "Kolima",
    "Kolipur",
    "Kolka",
    "Kolkatta",
    "Kolkonda",
    "Kolkota",
    "Kollapada",
    "Kollapalli",
    "Kolla",
    "Kollegata",
    "Kolli",
    "Kollidam",
    "Kolli Hills",
    "Kollipara",
    "Kollipur",
    "Kollisevakkam",
    "Kolmar",
    "Kolmer",
    "Kolmeshwar",
    "Kolpapad",
    "Kolpapuram",
    "Kolroli",
    "Kolsa",
    "Kolsandi",
    "Kolsandi",
    "Kolsarpara",
    "Kolsasatka",
    "Kolshe",
    "Kolshet",
    "Kolsur",
    "Kolsurpala",
    "Koltaan",
    "Koltala",
    "Koltapur",
    "Koltal",
    "Koltampa",
    "Koltandi",
    "Kolte",
    "Koltema",
    "Koltesam",
    "Kolthan",
    "Kolthangi",
    "Kolthel",
    "Kolthi",
    "Kolthigalli",
    "Kolthir",
    "Kolthiyam",
    "Kolthorn",
    "Kolthosira",
    "Kolthote",
    "Kolthra",
    "Kolthragi",
    "Kolthrai",
    "Kolthrai",
    "Koltham",
    "Kolthar",
    "Koltharekala",
    "Kolthari",
    "Kolthariyam",
    "Koltharipet",
    "Koltharipola",
    "Kolthariyampalayam",
    "Kolthariyampuzha",
  ],
  // Add more states as needed...
};

interface GeoFiltersProps {
  onFilterChange?: () => void;
}

export function GeoFilters({ onFilterChange }: GeoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedState, setSelectedState] = useState<string>(
    searchParams.get("state") || ""
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    searchParams.get("district") || ""
  );
  const [radiusKm, setRadiusKm] = useState<number>(
    parseInt(searchParams.get("radius_km") || "0") || 0
  );

  const availableDistricts =
    selectedState && DISTRICTS_BY_STATE[selectedState]
      ? DISTRICTS_BY_STATE[selectedState]
      : [];

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedState) {
      params.set("state", selectedState);
    } else {
      params.delete("state");
    }

    if (selectedDistrict) {
      params.set("district", selectedDistrict);
    } else {
      params.delete("district");
    }

    if (radiusKm > 0) {
      params.set("radius_km", String(radiusKm));
    } else {
      params.delete("radius_km");
    }

    const newUrl = `/jobs?${params.toString()}`;
    router.push(newUrl);
    onFilterChange?.();
  };

  const clearFilters = () => {
    setSelectedState("");
    setSelectedDistrict("");
    setRadiusKm(0);
    router.push("/jobs");
    onFilterChange?.();
  };

  const hasActiveFilters = selectedState || selectedDistrict || radiusKm > 0;

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <h3 className="mb-4 font-semibold">Filter by Location</h3>

      <div className="space-y-4">
        {/* State Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium">State</label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict(""); // Reset district when state changes
            }}
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
          >
            <option value="">All States</option>
            {STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        {selectedState && availableDistricts.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
            >
              <option value="">All Districts</option>
              {availableDistricts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Radius Filter */}
        {selectedDistrict && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Radius: {radiusKm} km
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 text-xs text-neutral-500">
              {radiusKm === 0 ? "Exact location only" : `Within ${radiusKm} km`}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={applyFilters}
            className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Apply Filters
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-md border border-black/20 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <strong>Active filters:</strong>
          {selectedState && (
            <span>
              {" "}
              State: {STATES.find((s) => s.code === selectedState)?.name}
            </span>
          )}
          {selectedDistrict && <span> · District: {selectedDistrict}</span>}
          {radiusKm > 0 && <span> · Radius: {radiusKm}km</span>}
        </div>
      )}
    </div>
  );
}
