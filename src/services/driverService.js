import driverRepository from "../repositories/driverRepository.js";

const createDriver = async (userId) => {
    return await driverRepository.createDriver(userId);
};

const updateDriverStatus = async (driverId, status) => {
    return await driverRepository.updateDriverStatus(driverId, status);
}

export default { createDriver, updateDriverStatus };