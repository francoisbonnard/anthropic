/**
 * Script de déploiement FTP pour zer0day.io/anthropic
 * Utilise les variables d'environnement (voir .env.example)
 */
require("dotenv").config();

const FtpDeploy = require("ftp-deploy");
const path = require("path");
const fs = require("fs");

// #region agent log
function dbg(msg, data = {}) {
  const payload = JSON.stringify({
    sessionId: "ce59f2",
    location: "deploy.cjs",
    message: msg,
    data,
    timestamp: Date.now(),
  }) + "\n";
  try {
    fs.appendFileSync(path.join(__dirname, "debug-ce59f2.log"), payload);
  } catch (_) {}
}
// #endregion

if (!process.env.FTP_USER || !process.env.FTP_PASSWORD || !process.env.FTP_HOST) {
  console.error("Erreur: définissez FTP_USER, FTP_PASSWORD et FTP_HOST dans le fichier .env");
  console.error("Copiez .env.example vers .env et remplissez les valeurs.");
  process.exit(1);
}

let ftpDeploy = new FtpDeploy();

const useSftp = process.env.FTP_SFTP === "true";
const defaultPort = useSftp ? 22 : 21;
// SFTP nécessite l'hôte SSH (ssh.clusterXXX), pas l'hôte FTP (ftp.clusterXXX)
let host = process.env.FTP_HOST;
if (useSftp && host?.startsWith("ftp.")) {
  host = host.replace("ftp.", "ssh.");
  console.log("SFTP: utilisation de l'hôte SSH", host, "(au lieu de ftp.*)");
}

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host,
  port: parseInt(process.env.FTP_PORT || String(defaultPort), 10),
  localRoot: path.join(__dirname, "dist"),
  remoteRoot: process.env.FTP_REMOTE_PATH || "/anthropic/",
  include: ["*", "**/*"],
  exclude: [],
  deleteRemote: false,
  forcePasv: !useSftp,
  sftp: useSftp,
  // Options SFTP pour éviter "Timeout while waiting for handshake" (OVH, hébergeurs)
  // forceIPv4: évite le timeout quand Node tente IPv6 alors que FileZilla utilise IPv4
  ...(useSftp && {
    forceIPv4: true,
    readyTimeout: 60000,
    algorithms: {
      kex: [
        "diffie-hellman-group-exchange-sha256",
        "diffie-hellman-group14-sha256",
        "ecdh-sha2-nistp256",
        "ecdh-sha2-nistp384",
      ],
      cipher: [
        "aes256-ctr",
        "aes192-ctr",
        "aes128-ctr",
        "aes256-cbc",
        "aes128-cbc",
      ],
      serverHostKey: [
        "ssh-rsa",
        "ecdsa-sha2-nistp256",
        "ecdsa-sha2-nistp384",
      ],
      hmac: ["hmac-sha2-256", "hmac-sha2-512", "hmac-sha1"],
    },
  }),
};

console.log("Upload vers:", config.remoteRoot);

ftpDeploy.on("uploading", (data) => {
  console.log(
    `[${data.transferredFileCount}/${data.totalFilesCount}] ${data.filename}`
  );
});

ftpDeploy.on("uploaded", (data) => {
  console.log(`Uploadé: ${data.filename}`);
});

ftpDeploy.on("upload-error", (data) => {
  console.error(`Erreur: ${data.filename}`, data.err);
});

function doDeploy(cfg, useNewInstance = false) {
  // #region agent log
  if (useNewInstance) dbg("doDeploy FTP (new instance)", { host: cfg.host, port: cfg.port });
  // #endregion
  const deployer = useNewInstance ? new FtpDeploy() : ftpDeploy;
  if (useNewInstance) {
    deployer.on("uploading", (data) => {
      console.log(
        `[${data.transferredFileCount}/${data.totalFilesCount}] ${data.filename}`
      );
    });
    deployer.on("uploaded", (data) => {
      console.log(`Uploadé: ${data.filename}`);
    });
    deployer.on("upload-error", (data) => {
      console.error(`Erreur: ${data.filename}`, data.err);
    });
  }
  return deployer.deploy(cfg).then(() => {
    console.log("Déploiement terminé avec succès.");
  });
}

doDeploy(config).catch((err) => {
  // #region agent log
  dbg("SFTP deploy failed", { errMsg: err?.message, useSftp });
  // #endregion
  // Fallback: si SFTP échoue (OVH connu pour "Unexpected end"), réessayer en FTP
  if (useSftp && err.message?.includes("Unexpected end")) {
    console.log("SFTP échoué, tentative avec FTP...");
    const ftpConfig = {
      ...config,
      sftp: false,
      host: process.env.FTP_HOST?.replace("ssh.", "ftp.") || process.env.FTP_HOST,
      port: 21,
      forcePasv: true,
    };
    delete ftpConfig.algorithms;
    delete ftpConfig.forceIPv4;
    delete ftpConfig.readyTimeout;
    // #region agent log
    dbg("FTP fallback starting", { host: ftpConfig.host, port: ftpConfig.port, remoteRoot: ftpConfig.remoteRoot });
    // #endregion
    return doDeploy(ftpConfig, true).then(
      () => {
        // #region agent log
        dbg("FTP fallback SUCCESS");
        // #endregion
      },
      (ftpErr) => {
        // #region agent log
        dbg("FTP fallback FAILED", { errMsg: ftpErr?.message });
        // #endregion
        throw ftpErr;
      }
    );
  }
  throw err;
}).catch((err) => {
  // #region agent log
  dbg("Final catch", { errMsg: err?.message });
  // #endregion
  console.error("Erreur de déploiement:", err.message);
  if (!process.env.FTP_USER || !process.env.FTP_PASSWORD || !process.env.FTP_HOST) {
    console.error("\nVérifiez que les variables FTP_USER, FTP_PASSWORD et FTP_HOST sont définies (fichier .env).");
  }
  process.exit(1);
});
