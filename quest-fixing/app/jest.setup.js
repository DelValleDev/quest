// jest.setup.js - loads .env.test if present
try {
  require("dotenv").config({ path: "./.env.test" });
} catch (e) {
  // ignore
}
