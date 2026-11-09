const { z } = require('zod');
const {
  ALLOWED_SETTING_KEYS,
  SETTING_GROUP_VALUES,
} = require('../config/settings.catalog');

const settingKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((key) => ALLOWED_SETTING_KEYS.includes(key), {
    message: 'key is not an allowed setting key',
  });

const adminSettingsListQuerySchema = z.object({
  group: z.enum(SETTING_GROUP_VALUES).optional(),
});

const settingKeyParamSchema = z.object({
  key: settingKeySchema,
});

const upsertSettingsBodySchema = z
  .object({
    settings: z
      .record(z.string(), z.string())
      .refine((value) => Object.keys(value).length > 0, {
        message: 'settings object cannot be empty',
      })
      .refine(
        (value) => Object.keys(value).every((key) => ALLOWED_SETTING_KEYS.includes(key)),
        { message: 'one or more setting keys are not allowed' }
      ),
  })
  .strict();

const patchSettingBodySchema = z
  .object({
    value: z.string().min(1, 'value is required'),
  })
  .strict();

module.exports = {
  adminSettingsListQuerySchema,
  settingKeyParamSchema,
  upsertSettingsBodySchema,
  patchSettingBodySchema,
};
