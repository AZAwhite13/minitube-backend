import Joi from "joi";

export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(30).required()
});


export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});


export const videoSchema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).allow("").optional(),
    videoUrl: Joi.string().uri().required()
});

export const commentSchema = Joi.object({
    text: Joi.string().trim().min(1).max(500).required()
});