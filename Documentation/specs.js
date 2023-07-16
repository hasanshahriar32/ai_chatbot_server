const swaggerUI = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const swaggerJSDocs = YAML.load(path.join(__dirname, "./api.yaml"));
// CDN CSS

const options = {
  customCss:
    "img {content:url('https://i.ibb.co/ZfZnZ7y/hstu-logo.png'); height:50px;}",

  customfavIcon: "https://i.ibb.co/ZfZnZ7y/hstu-logo.png",
  customSiteTitle: "api docs for hstu ai chatbot",
  customCssUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css",
};

module.exports = {
  swaggerServe: swaggerUI.serve,
  swaggerSetup: swaggerUI.setup(swaggerJSDocs, options),
};
