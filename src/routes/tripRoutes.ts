import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createTrip , getTrips,getTripById} from "../controllers/tripController.js";

const router = express.Router();

router.use(protect);

router.post("/",createTrip);
router.get("/",getTrips);
router.get("/:id",getTripById);

export default router;