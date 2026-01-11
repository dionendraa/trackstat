const jwt = require("jsonwebtoken");
const axios = require("axios");

const JWT_SECRET = "ROBLOXGGIN2025DAWG";
const ASSET_ID = "113992991231626";

// generate JWT
const token = jwt.sign(
  { role: "user" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

(async () => {
  try {
    const res = await axios.get(
      `https://apiweb.wintercode.dev/api/thumbnail?assetId=${ASSET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // output URL thumbnail
    console.log(res.data.url || res.data);
  } catch (err) {
    console.error(
      err.response?.data || err.message
    );
  }
})();
