const http = require("http");
const fs = require("fs");
const generateServerString = require("./utils/generateServerString.js");
const svrjsInfo = require("../svrjs.json");
const {version} = svrjsInfo;

let inspector = undefined;
try {
  inspector = require("inspector");
} catch (err) {
  // Don't use inspector
}

process.dirname = __dirname;

// TODO: after implementing clustering in new SVR.JS
//process.singleThreaded = false;
process.singleThreaded = true;

if (process.versions) process.versions.svrjs = version; // Inject SVR.JS into process.versions

let forceSecure = false;
let disableMods = false;

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file) {
      var curPath = path + "/" + file;
      if (fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

const args = process.argv;
for (let i = (process.argv[0].indexOf("node") > -1 || process.argv[0].indexOf("bun") > -1 ? 2 : 1); i < args.length; i++) {
  if (args[i] == "-h" || args[i] == "--help" || args[i] == "-?" || args[i] == "/h" || args[i] == "/?") {
    console.log("SVR.JS usage:");
    console.log("node svr.js [-h] [--help] [-?] [/h] [/?] [--secure] [--reset] [--clean] [--disable-mods] [--single-threaded] [-v] [--version]");
    console.log("-h -? /h /? --help    -- Displays help");
    console.log("--clean               -- Cleans up files created by SVR.JS");
    console.log("--reset               -- Resets SVR.JS to default settings (WARNING: DANGEROUS)");
    console.log("--secure              -- Runs HTTPS server");
    console.log("--disable-mods        -- Disables mods (safe mode)");
    console.log("--single-threaded     -- Run single-threaded");
    console.log("-v --version          -- Display server version");
    process.exit(0);
  } else if (args[i] == "--secure") {
    forceSecure = true;
  } else if (args[i] == "-v" || args[i] == "--version") {
    console.log(generateServerString(true));
    process.exit(0);
  } else if (args[i] == "--clean") {
    console.log("Removing logs...");
    deleteFolderRecursive(process.dirname + "/log");
    fs.mkdirSync(process.dirname + "/log");
    console.log("Removing temp folder...");
    deleteFolderRecursive(process.dirname + "/temp");
    fs.mkdirSync(process.dirname + "/temp");
    console.log("Done!");
    process.exit(0);
  } else if (args[i] == "--reset") {
    console.log("Removing logs...");
    deleteFolderRecursive(process.dirname + "/log");
    fs.mkdirSync(process.dirname + "/log");
    console.log("Removing temp folder...");
    deleteFolderRecursive(process.dirname + "/temp");
    fs.mkdirSync(process.dirname + "/temp");
    console.log("Removing configuration file...");
    fs.unlinkSync("config.json");
    console.log("Done!");
    process.exit(0);
  } else if (args[i] == "--disable-mods") {
    disableMods = true;
  } else if (args[i] == "--single-threaded") {
    process.singlethreaded = true;
  } else {
    console.log("Unrecognized argument: " + args[i]);
    console.log("SVR.JS usage:");
    console.log("node svr.js [-h] [--help] [-?] [/h] [/?] [--secure] [--reset] [--clean] [--disable-mods] [--single-threaded] [-v] [--version]");
    console.log("-h -? /h /? --help    -- Displays help");
    console.log("--clean               -- Cleans up files created by SVR.JS");
    console.log("--reset               -- Resets SVR.JS to default settings (WARNING: DANGEROUS)");
    console.log("--secure              -- Runs HTTPS server");
    console.log("--disable-mods        -- Disables mods (safe mode)");
    console.log("--single-threaded     -- Run single-threaded");
    console.log("-v --version          -- Display server version");
    process.exit(1);
  }
}

// Create log, mods and temp directories, if they don't exist.
if (!fs.existsSync(process.dirname + "/log")) fs.mkdirSync(process.dirname + "/log");
if (!fs.existsSync(process.dirname + "/mods")) fs.mkdirSync(process.dirname + "/mods");
if (!fs.existsSync(process.dirname + "/temp")) fs.mkdirSync(process.dirname + "/temp");

const cluster = require("./utils/clusterBunShim.js"); // Cluster module with shim for Bun
//const generateErrorStack = require("./utils/generateErrorStack.js");
//const getOS = require("./utils/getOS.js");
//const parseURL = require("./utils/urlParser.js");
//const fixNodeMojibakeURL = require("./utils/urlMojibakeFixer.js");

process.serverConfig = {};

// TODO: configuration from config.json
if (process.serverConfig.users === undefined) process.serverConfig.users = [];
if (process.serverConfig.secure === undefined) process.serverConfig.secure = false;
if (forceSecure) process.serverConfig.secure = true;
if (process.serverConfig.secure) {
  if (process.serverConfig.key === undefined) process.serverConfig.key = "cert/key.key";
  if (process.serverConfig.cert === undefined) process.serverConfig.cert = "cert/cert.crt";
  if (process.serverConfig.sport === undefined) process.serverConfig.sport = 443;
  if (process.serverConfig.spubport === undefined) process.serverConfig.spubport = 443;
  if (process.serverConfig.sni === undefined) process.serverConfig.sni = {};
  if (process.serverConfig.enableOCSPStapling === undefined) process.serverConfig.enableOCSPStapling = false;
  
}
if (process.serverConfig.port === undefined) process.serverConfig.port = 80;
if (process.serverConfig.pubport === undefined) process.serverConfig.pubport = 80;
if (process.serverConfig.domain === undefined && process.serverConfig.domian !== undefined) process.serverConfig.domain = process.serverConfig.domian;
delete process.serverConfig.domian;
if (process.serverConfig.page404 === undefined) process.serverConfig.page404 = "404.html";
//process.serverConfig.timestamp = timestamp; //TODO
//process.serverConfig.blacklist = blocklist.raw; //TODO
if (process.serverConfig.nonStandardCodes === undefined) process.serverConfig.nonStandardCodes = [];
if (process.serverConfig.enableCompression === undefined) process.serverConfig.enableCompression = true;
if (process.serverConfig.customHeaders === undefined) process.serverConfig.customHeaders = {};
if (process.serverConfig.enableHTTP2 === undefined) process.serverConfig.enableHTTP2 = false;
if (process.serverConfig.enableLogging === undefined) process.serverConfig.enableLogging = true;
if (process.serverConfig.enableDirectoryListing === undefined) process.serverConfig.enableDirectoryListing = true;
if (process.serverConfig.enableDirectoryListingWithDefaultHead === undefined) process.serverConfig.enableDirectoryListingWithDefaultHead = false;
if (process.serverConfig.serverAdministratorEmail === undefined) process.serverConfig.serverAdministratorEmail = "[no contact information]";
if (process.serverConfig.stackHidden === undefined) process.serverConfig.stackHidden = false;
if (process.serverConfig.enableRemoteLogBrowsing === undefined) process.serverConfig.enableRemoteLogBrowsing = false;
if (process.serverConfig.exposeServerVersion === undefined) process.serverConfig.exposeServerVersion = true;
if (process.serverConfig.disableServerSideScriptExpose === undefined) process.serverConfig.disableServerSideScriptExpose = true;
if (process.serverConfig.allowStatus === undefined) process.serverConfig.allowStatus = true;
if (process.serverConfig.rewriteMap === undefined) process.serverConfig.rewriteMap = [];
if (process.serverConfig.dontCompress === undefined) process.serverConfig.dontCompress = ["/.*\\.ipxe$/", "/.*\\.(?:jpe?g|png|bmp|tiff|jfif|gif|webp)$/", "/.*\\.(?:[id]mg|iso|flp)$/", "/.*\\.(?:zip|rar|bz2|[gb7x]z|lzma|tar)$/", "/.*\\.(?:mp[34]|mov|wm[av]|avi|webm|og[gv]|mk[va])$/"];
if (process.serverConfig.enableIPSpoofing === undefined) process.serverConfig.enableIPSpoofing = false;
if (process.serverConfig.disableNonEncryptedServer === undefined) process.serverConfig.disableNonEncryptedServer = false;
if (process.serverConfig.disableToHTTPSRedirect === undefined) process.serverConfig.disableToHTTPSRedirect = false;
if (process.serverConfig.enableETag === undefined) process.serverConfig.enableETag = true;
if (process.serverConfig.disableUnusedWorkerTermination === undefined) process.serverConfig.disableUnusedWorkerTermination = false;
if (process.serverConfig.rewriteDirtyURLs === undefined) process.serverConfig.rewriteDirtyURLs = false;
if (process.serverConfig.errorPages === undefined) process.serverConfig.errorPages = [];
if (process.serverConfig.useWebRootServerSideScript === undefined) process.serverConfig.useWebRootServerSideScript = true;
if (process.serverConfig.exposeModsInErrorPages === undefined) process.serverConfig.exposeModsInErrorPages = true;
if (process.serverConfig.disableTrailingSlashRedirects === undefined) process.serverConfig.disableTrailingSlashRedirects = false;
if (process.serverConfig.environmentVariables === undefined) process.serverConfig.environmentVariables = {};
if (process.serverConfig.customHeadersVHost === undefined) process.serverConfig.customHeadersVHost = [];
if (process.serverConfig.enableDirectoryListingVHost === undefined) process.serverConfig.enableDirectoryListingVHost = [];
if (process.serverConfig.wwwrootPostfixesVHost === undefined) process.serverConfig.wwwrootPostfixesVHost = [];
if (process.serverConfig.wwwrootPostfixPrefixesVHost === undefined) process.serverConfig.wwwrootPostfixPrefixesVHost = [];
if (process.serverConfig.allowDoubleSlashes === undefined) process.serverConfig.allowDoubleSlashes = false;
if (process.serverConfig.allowPostfixDoubleSlashes === undefined) process.serverConfig.allowPostfixDoubleSlashes = false;
if (process.serverConfig.optOutOfStatisticsServer === undefined) process.serverConfig.optOutOfStatisticsServer = false;

process.serverConfig.version = version; // Compatiblity for very old SVR.JS mods

const serverconsole = require("./utils/serverconsole.js");

let inspectorURL = undefined;
try {
  if (inspector) {
    inspectorURL = inspector.url();
  }
} catch (err) {
  // Failed to get inspector URL
}

if (!process.stdout.isTTY && !inspectorURL) {
  // When stdout is not a terminal and not attached to an Node.JS inspector, disable it to improve performance of SVR.JS
  console.log = function () {};
  process.stdout.write = function () {};
  process.stdout._write = function () {};
  process.stdout._writev = function () {};
}

var wwwrootError = null;
try {
  if (cluster.isPrimary || cluster.isPrimary === undefined) process.chdir(process.serverConfig.wwwroot != undefined ? process.serverConfig.wwwroot : process.dirname);
} catch (err) {
  wwwrootError = err;
}

let middleware = [
  require("./middleware/core.js"),
  require("./middleware/urlSanitizer.js"),
  require("./middleware/redirects.js"),
  // TODO: blocklist
  require("./middleware/webRootPostfixes.js"),
  require("./middleware/rewriteURL.js"),
  require("./middleware/responseHeaders.js"),
  require("./middleware/checkForbiddenPaths.js")
];

function addMiddleware(mw) {
  middleware.push(mw);
}

function requestHandler(req, res) {
  let reqIdInt = Math.floor(Math.random() * 16777216);
  if (reqIdInt == 16777216) reqIdInt = 0;
  const reqId = "0".repeat(6 - reqIdInt.toString(16).length) + reqIdInt.toString(16);

  // SVR.JS log facilities
  const logFacilities = {
    climessage: (msg) => serverconsole.climessage(msg, reqId),
    reqmessage: (msg) => serverconsole.reqmessage(msg, reqId),
    resmessage: (msg) => serverconsole.resmessage(msg, reqId),
    errmessage: (msg) => serverconsole.errmessage(msg, reqId),
    locerrmessage: (msg) => serverconsole.locerrmessage(msg, reqId),
    locwarnmessage: (msg) => serverconsole.locwarnmessage(msg, reqId),
    locmessage: (msg) => serverconsole.locmessage(msg, reqId)
  };

  // SVR.JS configuration object (modified)
  const config = Object.assign(process.serverConfig);

  let index = 0;

  // Call the next middleware function
  const next = () => {
    const currentMiddleware = middleware[index++];
    if (currentMiddleware) {
      try {
        currentMiddleware(req, res, logFacilities, config, next);
      } catch (err) {
        if (res.error) res.error(500, err);
        else {
          logFacilities.errmessage("There was an error while processing the request!");
                logFacilities.errmessage("Stack:");
                logFacilities.errmessage(err.stack);
          res.writeHead(500, "Internal Server Error", {
            Server: generateServerString(config.exposeServerVersion)
          });
          res.end("Error while executing the request handler");
        }
      }
    } else {
      if (res.error) res.error(404);
      else {
        res.writeHead(404, "Not Found", {
          Server: generateServerString(config.exposeServerVersion)
        });
        res.end("Request handler missing");
      }
    }
  }

  // Handle middleware
  next();
}

// Create HTTP server
http.createServer(requestHandler).listen(3000);

if(wwwrootError) throw wwwrootError;