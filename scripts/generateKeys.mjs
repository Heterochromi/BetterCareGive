import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
 
const keyPair = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keyPair.privateKey);
const publicKey = await exportJWK(keyPair.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
 
process.stdout.write(
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`,
);
process.stdout.write("\n");
process.stdout.write(`JWKS=${jwks}`);
process.stdout.write("\n");