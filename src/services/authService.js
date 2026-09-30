import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import userRepository from "../repositories/userRepository.js"
import dotenv from "dotenv";

dotenv.config();

const login = async (phone, password) => {
    const user = await userRepository.findByPhone(phone);

    if (!user || !user.password_hash) {
        return null;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
        return null;
    }

    const token = jwt.sign(
        {
            userId: user.id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    return { 
        token,
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone
        }
    };

}

export default { login };