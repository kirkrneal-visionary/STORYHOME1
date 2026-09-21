/**
 * P2B2B reviewed Census TIGER Place references.
 * UUID is Story Home identity. GEOID/GNIS never replace it.
 * Mapping is explicit. Not name match.
 */

export const LOCAL_PLACE_BOUNDARY_SOURCE = "census_tiger_place" as const;
export const LOCAL_PLACE_BOUNDARY_VINTAGE = "tiger_2024" as const;

export type LocalPlaceBoundaryRef = {
  localPlaceId: string;
  displayName: string;
  censusGeoid: string;
  gnis: string;
};

export const LOCAL_PLACE_BOUNDARY_REFS: readonly LocalPlaceBoundaryRef[] = [
  { localPlaceId: "00029d4e-eb06-5551-83de-6e016d76fa06", displayName: "Lufkin", censusGeoid: "4845072", gnis: "02410895" },
  { localPlaceId: "805d173e-ecae-5c3e-ab92-e4e6dde01d98", displayName: "Diboll", censusGeoid: "4820308", gnis: "02410335" },
  { localPlaceId: "384780b5-d56e-5cc0-a88b-5a5067bf1fe4", displayName: "Huntington", censusGeoid: "4835492", gnis: "02410809" },
  { localPlaceId: "c1c8ba40-9a9f-5f52-8822-3a1139cca38c", displayName: "Hudson", censusGeoid: "4835228", gnis: "02410800" },
  { localPlaceId: "62fc788a-b066-50d1-8324-edef95b863b2", displayName: "Zavalla", censusGeoid: "4880728", gnis: "02412330" },
  { localPlaceId: "e27d8dab-f9bb-5a40-88a0-989630cf6c91", displayName: "Liberty", censusGeoid: "4842568", gnis: "02410832" },
  { localPlaceId: "4fcae51d-b8f4-5284-8eb7-3d339e199cbb", displayName: "Dayton", censusGeoid: "4819432", gnis: "02410300" },
  { localPlaceId: "d34e1210-95ec-5371-92cf-69271971259e", displayName: "Cleveland", censusGeoid: "4815436", gnis: "02409482" },
  { localPlaceId: "57b6c1da-0815-5ea9-9202-ec53a86f6c87", displayName: "Livingston", censusGeoid: "4843132", gnis: "02412903" },
  { localPlaceId: "d75a8e75-9369-563c-af62-82161d9adf27", displayName: "Corrigan", censusGeoid: "4817036", gnis: "02413246" },
  { localPlaceId: "1914bd8f-60ea-5d33-b54e-554203422f60", displayName: "Goodrich", censusGeoid: "4830224", gnis: "02410621" },
  { localPlaceId: "df5284bd-dc05-5397-b4e9-14fbd75ba1ca", displayName: "Onalaska", censusGeoid: "4854048", gnis: "02411321" },
  { localPlaceId: "d44ba033-63c7-5d3e-a701-9f07b33b78cd", displayName: "Coldspring", censusGeoid: "4815892", gnis: "02410188" },
  { localPlaceId: "a008239f-c217-5c7d-9e68-e42ff0ba1582", displayName: "Shepherd", censusGeoid: "4867424", gnis: "02411884" },
  { localPlaceId: "33b96f7a-394f-508f-bb97-f53ea282e6a8", displayName: "Groveton", censusGeoid: "4831340", gnis: "02410670" },
  { localPlaceId: "6e8bfac5-1b0c-531d-be26-f53bef1ecf42", displayName: "Trinity", censusGeoid: "4873664", gnis: "02412096" },
  { localPlaceId: "e48fe0cb-c8ee-5620-bf75-5cae48bf095f", displayName: "Woodville", censusGeoid: "4880212", gnis: "02413511" },
  { localPlaceId: "e4fdb7d1-c85b-5d15-a05d-c1efdefd760c", displayName: "Colmesneil", censusGeoid: "4816048", gnis: "02410196" },
  { localPlaceId: "8d6bbd11-5bf8-5f0e-bf9d-f802fad19bdb", displayName: "Chester", censusGeoid: "4814584", gnis: "02413194" },
  { localPlaceId: "860e0e40-a3b2-5e4f-baef-4b8e39f8e219", displayName: "Huntsville", censusGeoid: "4835528", gnis: "02410080" },
  { localPlaceId: "41c657a5-f134-5563-9c5a-8e418f641d6c", displayName: "New Waverly", censusGeoid: "4851396", gnis: "02411237" },
  { localPlaceId: "1bbd2277-4760-5619-91b3-d47415012c1c", displayName: "Riverside", censusGeoid: "4862408", gnis: "02410966" },
];
