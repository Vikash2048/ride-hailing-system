import z from "zod";

const registerSchema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(15),
    password: z.string().min(8)
});

const loginSchema = z.object({
    phone: z.string().min(10).max(15),
    password: z.string().min(8)
});

export { loginSchema, registerSchema };