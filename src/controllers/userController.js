import userService from "../services/userService.js";
import authService from "../services/authService.js";

const createUser = async (req, res) => {
    try {
        const { name, phone, password, email } = req.body;


        if (!name || !phone || !password) {
            return res.status(400).json({
                error: "Name and Phone are required"
            });
        }

        const user = await userService.createUser(name, phone, email, password);

        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to create user"
        });
    }
}

const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                errro: "Phone and password are required"
            });
        }

        const result = await authService.login(phone, password)

        if (!result) {
            return res.status(401).json({
                error: "Invalid phone or password"
            });
        }

        res.json(result);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
}

export default { createUser, login };
