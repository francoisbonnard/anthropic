/**
 * Script de déploiement FTP pour zer0day.io/anthropic
 * Utilise les variables d'environnement (voir .env.example)
 */
require("dotenv").config();

const FtpDeploy = require("ftp-deploy");
const path = require("path");

if (!process.env.FTP_USER || !process.env.FTP_PASSWORD || !process.env.FTP_HOST) {
  console.error("Erreur: définissez FTP_USER, FTP_PASSWORD et FTP_HOST dans le fichier .env");
  console.error("Copiez .env.example vers .env et remplissez les valeurs.");
  process.exit(1);
}

const ftpDeploy = new FtpDeploy();

const useSftp = process.env.FTP_SFTP === "true";
const defaultPort = useSftp ? 22 : 21;

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
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

ftpDeploy
  .deploy(config)
  .then(() => console.log("Déploiement FTP terminé avec succès."))
  .catch((err) => {
    console.error("Erreur de déploiement:", err.message);
    if (!process.env.FTP_USER || !process.env.FTP_PASSWORD || !process.env.FTP_HOST) {
      console.error("\nVérifiez que les variables FTP_USER, FTP_PASSWORD et FTP_HOST sont définies (fichier .env).");
    }
    process.exit(1);
  });
