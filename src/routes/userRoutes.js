import express from "express";
import userController from "../controllers/userController.js";
import { validate } from "../middleware/validator.js";
import { loginSchema, registerSchema } from "../validators/authValidator.js";

const router = express.Router();

router.post("/", validate(registerSchema), userController.createUser);
router.post("/login",  validate(loginSchema), userController.login);

export default router;