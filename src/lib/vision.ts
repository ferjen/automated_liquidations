import { ImageAnnotatorClient } from "@google-cloud/vision";

export const runtime = "nodejs";

let cachedClient: ImageAnnotatorClient | null = null;

function getGoogleCredentials() {
	let raw = process.env.GCP_SERVICE_ACCOUNT;
	const b64 = process.env.GCP_SERVICE_ACCOUNT_BASE64;
	if (!raw && b64) {
		raw = Buffer.from(b64, "base64").toString("utf8");
	}
	if (!raw) {
		throw new Error(
			"Missing GCP_SERVICE_ACCOUNT or GCP_SERVICE_ACCOUNT_BASE64 env var with service account JSON"
		);
	}
	const json = JSON.parse(raw);
	const clientEmail: string | undefined = json.client_email;
	const privateKey: string | undefined = json.private_key;
	const projectId: string | undefined = json.project_id;
	if (!clientEmail || !privateKey) {
		throw new Error("Invalid service account JSON. Expecting client_email and private_key.");
	}
	return { clientEmail, privateKey, projectId };
}

export function getVisionClient(): ImageAnnotatorClient {
	if (cachedClient) return cachedClient;
	const { clientEmail, privateKey, projectId } = getGoogleCredentials();
	cachedClient = new ImageAnnotatorClient({
		credentials: { client_email: clientEmail, private_key: privateKey },
		projectId,
	});
	return cachedClient;
}


