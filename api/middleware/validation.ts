import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message),
      });
      return;
    }
    next();
  };
};

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  userPss: Joi.string().min(8).required(),
  name: Joi.string().required(),
  surname: Joi.string().required(),
  birthdate: Joi.date().required(),
  zipCode: Joi.string().required(),
  tagIds: Joi.array().items(Joi.number().integer().positive()).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  userPss: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const createRequestSchema = Joi.object({
  tagIds: Joi.array().items(Joi.number().integer().positive()).required(),
  outDate: Joi.string().optional(),
  countryId: Joi.string().required(),
  uuid: Joi.string().optional(), // Allow but ignore - we use authenticated user's UUID
});
