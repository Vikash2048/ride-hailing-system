import userRepository from "../repositories/userRepository.js";

const createUser = async(name, phone, email) => {
    // business logic

    const user = await userRepository.createUser(name, phone, email);
    return user;
};

export default { createUser };