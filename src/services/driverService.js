import driverRepository from "../repositories/driverRepository.js";

const createDriver = async (userId) => {
    return await driverRepository.createDriver(userId);
};

export default { createDriver };