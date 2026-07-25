import { createThirdwebClient } from "thirdweb";

// Get a free client ID at https://thirdweb.com/create-api-key
// It's required for social login (Google) to work.
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});
