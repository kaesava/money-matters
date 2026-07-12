export interface StructuredAddress {
  street: string;
  suburb: string;
  state?: string;
  postcode: string;
  country: string;
  formattedAddress: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
}
