import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createTrip , getTrips,getTripById,updateTrip,deleteTrip} from "../controllers/tripController.js";

const router = express.Router();

router.use(protect);

router.post("/",createTrip);
router.get("/",getTrips);
router.get("/:id",getTripById);
router.patch("/:id",updateTrip);
router.delete("/:id",deleteTrip);

export default router;