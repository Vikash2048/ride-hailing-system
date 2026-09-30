import userRepository from "../repositories/userRepository.js";
import bcrypt from "bcrypt";

const createUser = async(name, phone, email, password) => {
    // business logic

    // hass password before store
    const hashPassword = await bcrypt.hash(password, 12);

    const user = await userRepository.createUser(name, phone, email, hashPassword);
    return user;
};

export default { createUser };