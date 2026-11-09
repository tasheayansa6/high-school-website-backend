const commonSchemas = require('./common.schemas');
const authSchemas = require('./auth.schemas');
const pageSchemas = require('./page.schemas');
const blogSchemas = require('./blog.schemas');
const contactSchemas = require('./contact.schemas');

module.exports = {
  ...commonSchemas,
  ...authSchemas,
  ...pageSchemas,
  ...blogSchemas,
  ...contactSchemas,
};
