export const apiConfig = {
  hotel: {
    baseUrl: process.env.HOTEL_API_URL || 'http://localhost:3000',
  },

  azure: {
    baseUrl: process.env.AZURE_API_URL || '',
  },

  gcp: {
    baseUrl: process.env.GCP_API_URL || '',
  },
};