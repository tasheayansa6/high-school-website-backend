const { z } = require('zod');
const { idField } = require('./common');

const peerTypeSchema = z.enum(['ADMIN', 'TEACHER', 'STUDENT']);

const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const messageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const contactsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

const startConversationBodySchema = z.object({
  peerType: peerTypeSchema,
  peerId: idField,
});

const sendMessageBodySchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

const idParamSchema = z.object({ id: idField });

module.exports = {
  conversationListQuerySchema,
  messageListQuerySchema,
  contactsQuerySchema,
  startConversationBodySchema,
  sendMessageBodySchema,
  idParamSchema,
};
