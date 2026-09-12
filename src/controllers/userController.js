import userService from "../services/userService.js";

const createUser = async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                error: "Name and Phone are required"
            });
        }

        const user = await userService.createUser(name, phone, email);

        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to create user0"
        });
    }
}

export default { createUser };
