export const config = {
  backendUrl: process.env.CV_BACKEND_URL ?? "http://localhost:8000",
  requestTimeout: 120_000,
  uploadTimeout: 30_000,
};
