import { Platform } from "react-native";
import Constants from "expo-constants";

type RevenueCatConfig = {
	iosApiKey?: string;
	androidApiKey?: string;
	entitlement?: string;
	offering?: string;
};

function getRevenueCatConfig(): RevenueCatConfig | null {
	const extra: any = (Constants.expoConfig as any)?.extra || {};
	const rc: any = extra.revenuecat || extra.revenueCat || {};
	const cfg: RevenueCatConfig = {
		iosApiKey: rc.iosApiKey || rc.ios_api_key,
		androidApiKey: rc.androidApiKey || rc.android_api_key,
		entitlement: rc.entitlement || rc.entitlementId || "premium",
		offering: rc.offering || rc.offeringId || undefined,
	};
	if (!cfg.iosApiKey && !cfg.androidApiKey) return null;
	return cfg;
}

export async function configureRevenueCat(): Promise<void> {
	if (Platform.OS === "web") return;
	const cfg = getRevenueCatConfig();
	if (!cfg) return;
	try {
		const PurchasesModule = await import("react-native-purchases");
		const Purchases = PurchasesModule.default;
		const apiKey = Platform.OS === "ios" ? cfg.iosApiKey : cfg.androidApiKey;
		if (!apiKey) return;
		if (PurchasesModule.LOG_LEVEL) {
			Purchases.setLogLevel(PurchasesModule.LOG_LEVEL.WARN);
		}
		await Purchases.configure({ apiKey });
	} catch (e) {
		console.warn("RevenueCat configure skipped/failed:", e);
	}
}

export async function checkIsPremium(): Promise<boolean> {
	if (Platform.OS === "web") return false;
	const cfg = getRevenueCatConfig();
	if (!cfg) return false;
	try {
		const Purchases = (await import("react-native-purchases")).default;
		const info = await Purchases.getCustomerInfo();
		const entitlementId = cfg.entitlement || "premium";
		const entitlement = info?.entitlements?.active?.[entitlementId];
		return Boolean(entitlement);
	} catch (e) {
		console.warn("RevenueCat checkIsPremium failed:", e);
		return false;
	}
}

export async function restorePurchasesAndCheck(): Promise<boolean> {
	if (Platform.OS === "web") return false;
	const cfg = getRevenueCatConfig();
	if (!cfg) return false;
	try {
		const Purchases = (await import("react-native-purchases")).default;
		const info = await Purchases.restorePurchases();
		const entitlementId = cfg.entitlement || "premium";
		const entitlement = info?.entitlements?.active?.[entitlementId];
		return Boolean(entitlement);
	} catch (e) {
		console.warn("RevenueCat restorePurchases failed:", e);
		return false;
	}
}

export function getEntitlementIdentifier(): string {
	const cfg = getRevenueCatConfig();
	return cfg?.entitlement || "premium";
}

export function getOfferingIdentifier(): string | undefined {
	const cfg = getRevenueCatConfig();
	return cfg?.offering || undefined;
}


