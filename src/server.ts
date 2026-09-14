import dotenv, { config } from "dotenv";
import app from "./app.js";
import Connectdb from "./config/db.js"

dotenv.config();

Connectdb();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});