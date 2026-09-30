const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if(!result.success) {
            return res.status(400).json({
                error: "Invalid request",
                details: result.error.issues0
            });
        }

        req.body = result.data;
        next();
    };
};

export { validate }