export type SampleListing = {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  sqft: string;
  tag: string;
  image: string;
  imageAlt: string;
};

export const FEATURED_LISTING: SampleListing = {
  id: "featured-harbor-house",
  title: "Harbor House on Willow Lane",
  location: "Sausalito, CA",
  price: "$4,850,000",
  beds: 5,
  baths: 4.5,
  sqft: "4,220",
  tag: "Off-market",
  image:
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=80",
  imageAlt: "Modern luxury home with warm evening light and pool terrace",
};

export const SAMPLE_LISTINGS: SampleListing[] = [
  {
    id: "cliffside-residence",
    title: "Cliffside Residence",
    location: "Malibu, CA",
    price: "$7,200,000",
    beds: 6,
    baths: 5,
    sqft: "5,840",
    tag: "Private listing",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Contemporary cliffside villa with glass walls",
  },
  {
    id: "garden-court",
    title: "Garden Court Estate",
    location: "Pasadena, CA",
    price: "$3,150,000",
    beds: 4,
    baths: 3.5,
    sqft: "3,610",
    tag: "Story pick",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Modern home with landscaped courtyard and large windows",
  },
  {
    id: "lakeview-pavilion",
    title: "Lakeview Pavilion",
    location: "Lake Tahoe, NV",
    price: "$5,450,000",
    beds: 5,
    baths: 4,
    sqft: "4,080",
    tag: "New",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Luxury home interior living space with floor-to-ceiling windows",
  },
];
