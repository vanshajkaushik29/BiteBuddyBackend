import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createTrip , getTrips, getMyTrips, getTripById, updateTrip, deleteTrip, completeTrip,} from "../controllers/tripController.js";

const router = express.Router();

router.use(protect);

router.post("/",createTrip);
router.get("/",getTrips);
router.get("/mine",getMyTrips);
router.get("/:id",getTripById);
router.patch("/:id",updateTrip);
router.patch("/:id/complete",completeTrip);
router.delete("/:id",deleteTrip);

export default router;