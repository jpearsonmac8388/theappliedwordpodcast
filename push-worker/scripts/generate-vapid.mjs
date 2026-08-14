import { generateVAPIDKeys } from "web-push-neo";
const keys = await generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("\nStore both values as Worker secrets. The public key is returned to the PWA by /config; never put the private key in the app.");
