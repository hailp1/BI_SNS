import * as Joi from 'joi';

export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().default('http://localhost:8090'),

  DATABASE_HOST: Joi.string().default('standard_postgres'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().default('cj_sec_admin'),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().default('cj_enterprise_db'),
  DATABASE_URL: Joi.string().optional(),

  REDIS_HOST: Joi.string().default('standard_redis'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),

  DATA_PAYLOADS_DIR: Joi.string().default('/app/data_payloads'),
  PAYLOAD_KEY: Joi.string().min(32).required(),

  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_TLS_REJECT_UNAUTHORIZED: Joi.string().valid('true', 'false').default('true'),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
});
