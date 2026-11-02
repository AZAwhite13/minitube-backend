export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false
        });

        if (error) {
            return res.status(400).json({
                message: "Ma'lumotlar noto'g'ri",
                errors: error.details.map((detail) => detail.message)
            });
        }

        req.body = value;

        next();
    };
};