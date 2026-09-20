export const externalApis = {
  azure: {
    baseUrl: process.env.AZURE_API_URL || '',
  },

  gcp: {
    baseUrl: process.env.GCP_API_URL || '',
  },
};