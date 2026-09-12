import driverService from "../services/driverService.js";

const createDriver = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "userId is required"
            });
        }

        const driver = await driverService.createDriver(userId);
        res.status(201).json(driver);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to create driver"
        });
    }
};

export default { createDriver };