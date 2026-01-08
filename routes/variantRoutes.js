import express from "express";
import upload from "../middleware/upload.js";
import {
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from "../controllers/variantController.js";

const router = express.Router();

router.get("/", getVariants);
router.post("/", upload.single("image"), createVariant);
router.put("/:id", upload.single("image"), updateVariant);
router.delete("/:id", deleteVariant);

export default router;
