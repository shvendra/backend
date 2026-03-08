import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ENV = process.env.PAYMENT_ENV || "dev";

const OAUTH_URL =
  ENV === "prod"
    ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

const CLIENT_ID =
  ENV === "prod"
    ? process.env.PROD_CLIENT_ID
    : process.env.SANDBOX_CLIENT_ID;

const CLIENT_SECRET =
  ENV === "prod"
    ? process.env.PROD_CLIENT_SECRET
    : process.env.SANDBOX_CLIENT_SECRET;

const CLIENT_VERSION = "1";

let accessToken = null;
let tokenExpiry = null;

async function fetchOAuthToken() {
  try {
    // console.log("Fetching PhonePe OAuth token...");

    const response = await axios.post(
      OAUTH_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_version: CLIENT_VERSION,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    if (data?.access_token && data?.expires_at) {
      accessToken = data.access_token;
      tokenExpiry = data.expires_at * 1000; // convert to ms
      // console.log("✅ OAuth token fetched successfully.");
    } else {
      console.error("❌ Unexpected token response:", data);
    }
  } catch (error) {
    console.error("❌ Error fetching OAuth token:", error.response?.data || error.message);
  }
}

// Refresh token every 5 minutes if needed
setInterval(async () => {
  if (!tokenExpiry || tokenExpiry - Date.now() <= 5 * 60 * 1000) {
    await fetchOAuthToken();
  }
}, 5 * 60 * 1000);

// Fetch immediately at startup
fetchOAuthToken();

export const getToken = () => accessToken;
