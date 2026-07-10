import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Product {
    id: string;
    isPremium: boolean;
    name: string;
    description: string;
    isActive: boolean;
    imageUrl?: string;
    currency: string;
    priceInCents: bigint;
}
export type Result_2 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface EmailLog {
    sentTimestamp: bigint;
    subject: string;
    errorMessage?: string;
    deliveryStatus: string;
    email: string;
}
export interface AuditEntry {
    id: string;
    action: string;
    actorRole: string;
    target: string;
    timestamp: bigint;
    actorEmail: string;
}
export interface LicenseRequest {
    features: Array<string>;
    deliveryMethod: string;
    expirationDate: bigint;
    recipientEmail: string;
}
export type Result_1 = {
    __kind__: "ok";
    ok: {
        customerName: string;
        status: string;
        features: Array<string>;
        amountTotal: bigint;
        sessionId: string;
        bamm_transaction_id: string;
        customerEmail: string;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface PipelineStep {
    step: string;
    message: string;
    timestamp: bigint;
}
export interface ResendConfiguration {
    serviceName: string;
    baseUrl: string;
    apiKey: string;
    senderEmail: string;
}
export type InstallerDownloadResult = {
    __kind__: "ok";
    ok: {
        file: ExternalBlob;
        mimeType: string;
        fileName: string;
    };
} | {
    __kind__: "err";
    err: string;
};
export type EmailSendResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface PremiumPurchase {
    customerName: string;
    status: string;
    features: Array<string>;
    paymentConfirmation: string;
    email: string;
    timestamp: bigint;
    stripeSessionId: string;
    amount: bigint;
    transactionId: string;
    entitlementId: string;
}
export interface EntitlementStatusView {
    entitlementId: string;
    email: string;
    features: Array<string>;
    status: string;
    activationDeadlineIso: string;
    activatedAtIso?: string;
    expiresIso?: string;
    machineBindingDigest?: string;
    activationNonce: string;
}
export interface LinkedPremiumPurchaseView {
    transactionId: string;
    stripeSessionId: string;
    amount: bigint;
    status: string;
    paymentConfirmation: string;
    features: Array<string>;
    customerName: string;
    purchasedAtIso: string;
    entitlementId: string;
}
export interface EntitlementWorkflowStep {
    step: string;
    message: string;
    timestamp: bigint;
    stripeSessionId?: string;
}
export interface EntitlementRegistryEntry {
    entitlement: EntitlementStatusView;
    purchasedAtIso: string;
    updatedAtIso: string;
    linkedPurchases: Array<LinkedPremiumPurchaseView>;
    workflowSteps: Array<EntitlementWorkflowStep>;
}
export interface LicenseFeature {
    id: string;
    featureType: string;
    licenseReferenceName: string;
    isPremium: boolean;
    name: string;
    description: string;
    isActive: boolean;
    image?: ExternalBlob;
    priceInCents: bigint;
}
export interface LicenseBundle {
    bundleId: string;
    name: string;
    priceInCentsAnnual: bigint;
    featureIds: Array<string>;
    headline: string;
    bullets: Array<string>;
    badge: string;
    saveTextOverride: string;
    disclaimer: string;
    alaCarteSumCents: bigint;
    savingsCents: bigint;
    isActive: boolean;
    sortOrder: bigint;
}
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface EmailAutomationSettings {
    emailSubject: string;
    emailBody: string;
}
export interface TransactionLog {
    id: string;
    customerName: string;
    licenseStatus: string;
    features: Array<string>;
    createdAt: bigint;
    amountPaid: string;
    updatedAt: bigint;
    pipelineSteps: Array<PipelineStep>;
    recipientEmail: string;
    transactionId: string;
}
export interface UserSubmission {
    name: string;
    email: string;
    timestamp: bigint;
    downloadCount: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type Result = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface AdminRecordPublic {
    id: string;
    status: AdminStatus;
    principal?: Principal;
    name: string;
    role: AdminRole;
    invitedAt: bigint;
    invitedBy: string;
    email: string;
    isProtected: boolean;
    lastLogin?: bigint;
}
export interface LicenseRecord {
    features: Array<string>;
    deliveryStatus: string;
    expirationDate: bigint;
    licenseJson: string;
    generatedTimestamp: bigint;
    recipientEmail: string;
}
export interface UserProfile {
    name: string;
    email: string;
}
export enum AdminRole {
    licenseGenerator = "licenseGenerator",
    superAdmin = "superAdmin",
    featuresManager = "featuresManager",
    administrator = "administrator"
}
export enum AdminStatus {
    active = "active",
    pending = "pending",
    deactivated = "deactivated"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addLicenseFeature(feature: LicenseFeature): Promise<void>;
    addLicenseBundle(bundle: LicenseBundle): Promise<void>;
    addProduct(product: Product): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignSuperAdmin(email: string): Promise<Result>;
    bootstrapSuperAdmin(name: string, email: string): Promise<string>;
    checkAnyPendingInvite(): Promise<{
        role: string;
        email?: string;
        hasUnlinked: boolean;
    } | null>;
    checkMyPendingInvite(): Promise<{
        role: string;
        email: string;
    } | null>;
    claimAdminInvite(email: string, tempPassword: string): Promise<Result>;
    claimRoleElevation(tempPassword: string): Promise<Result>;
    claimSuperAdmin(code: string, name: string, email: string): Promise<Result>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deactivateAdmin(email: string): Promise<Result>;
    deleteAdmin(email: string): Promise<Result>;
    deleteEmailLog(logKey: string): Promise<void>;
    deleteEmailLogs(logKeys: Array<string>): Promise<void>;
    deleteLicenseFeature(featureId: string): Promise<void>;
    deleteLicenseBundle(bundleId: string): Promise<void>;
    deleteLicenseRecord(recordId: string): Promise<void>;
    deleteLicenseRecords(recordIds: Array<string>): Promise<void>;
    deletePremiumPurchase(transactionId: string): Promise<Result_3>;
    deletePremiumPurchases(transactionIds: Array<string>): Promise<Result_2>;
    deleteProduct(productId: string): Promise<void>;
    deleteTransactionLog(id: string): Promise<boolean>;
    deleteTransactionLogs(ids: Array<string>): Promise<bigint>;
    deleteUserSubmission(email: string): Promise<void>;
    disableFeature(featureId: string): Promise<void>;
    downloadMacInstaller(): Promise<InstallerDownloadResult>;
    downloadWindowsInstaller(): Promise<InstallerDownloadResult>;
    elevateAdminRole(adminId: string, newRole: AdminRole): Promise<Result>;
    enableFeature(featureId: string): Promise<void>;
    fulfillPaidLicense(sessionId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    generateAndSendPaidLicense(sessionId: string, signedLicenseJson: string, customerEmail: string, customerName: string, features: Array<string>, amountTotal: number): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    generateLicense(request: LicenseRequest): Promise<string>;
    getActiveFeatures(): Promise<Array<LicenseFeature>>;
    getActivePremiumProductNames(): Promise<Array<string>>;
    getAuditLog(limit: bigint): Promise<Array<AuditEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConfigurationStatus(): Promise<{
        stripeConfigured: boolean;
        privateKeyPresent: boolean;
        resendConfigured: boolean;
    }>;
    getCoreFeatures(): Promise<Array<LicenseFeature>>;
    getEntitlementRegistry(): Promise<Array<EntitlementRegistryEntry>>;
    getInstallerFileNames(): Promise<{
        macFileName: string | null;
        windowsFileName: string | null;
    }>;
    backfillEntitlementsFromPurchases(): Promise<{
        __kind__: "ok";
        ok: {
            created: bigint;
            linked: bigint;
            skippedAlreadyLinked: bigint;
            skippedNoFeatures: bigint;
            skippedIneligibleStatus: bigint;
            registrySize: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    getEmailAutomationSettings(): Promise<EmailAutomationSettings>;
    getEmailLogs(): Promise<Array<EmailLog>>;
    getLicenseFeatures(): Promise<Array<LicenseFeature>>;
    getLicenseBundles(): Promise<Array<LicenseBundle>>;
    getAllLicenseBundles(): Promise<Array<LicenseBundle>>;
    getLicenseRecords(): Promise<Array<LicenseRecord>>;
    getLicenseReferenceNames(): Promise<Array<string>>;
    getMacInstallerFile(): Promise<{
        file: ExternalBlob;
        mimeType: string;
        fileName: string;
    } | null>;
    getMyAdminRole(): Promise<string | null>;
    getPremiumFeatures(): Promise<Array<LicenseFeature>>;
    getPremiumPurchases(): Promise<Array<PremiumPurchase>>;
    getPrivateKeyFile(): Promise<ExternalBlob | null>;
    getPrivateKeyForSigning(): Promise<ExternalBlob | null>;
    getProducts(): Promise<Array<Product>>;
    getResendConfiguration(): Promise<ResendConfiguration | null>;
    getStripeSessionStatus(sessionId: string): Promise<Result_1>;
    getSuperAdminClaimCode(): Promise<string>;
    getTransactionLogs(): Promise<Array<TransactionLog>>;
    getTrialEligibleProductNames(): Promise<Array<string>>;
    getTrialLicenseFile(): Promise<ExternalBlob | null>;
    getTrialLicensePayload(email: string): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSubmissions(): Promise<Array<UserSubmission>>;
    getWindowsInstallerFile(): Promise<{
        file: ExternalBlob;
        mimeType: string;
        fileName: string;
    } | null>;
    incrementDownloadCount(email: string): Promise<void>;
    initializeDefaultPremiumFeatures(): Promise<void>;
    initializeDefaultLicenseBundles(): Promise<void>;
    inviteAdmin(name: string, email: string, role: AdminRole): Promise<Result>;
    isAdminByRole(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    listAdmins(): Promise<Array<AdminRecordPublic>>;
    logEmail(email: string, subject: string, deliveryStatus: string): Promise<void>;
    migrateFeatureNames(): Promise<string>;
    reactivateAdmin(email: string): Promise<Result>;
    recordLicense(licenseJson: string, recipientEmail: string, features: Array<string>, expirationDate: bigint, deliveryStatus: string): Promise<void>;
    recordPremiumPurchase(email: string, transactionId: string, amount: bigint, status: string, customerName: string, stripeSessionId: string, paymentConfirmation: string, features: Array<string>): Promise<void>;
    regenerateSuperAdminClaimCode(): Promise<Result>;
    removeFeatureImage(featureId: string): Promise<void>;
    resendPurchaseLicense(transactionId: string, recipientEmail: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    resendTrialLicense(email: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendManualLicense(recipientName: string, recipientEmail: string, selectedFeatures: Array<string>): Promise<EmailSendResult>;
    sendSignedPaidLicense(sessionId: string, signedLicenseJson: string, customerEmail: string, features: Array<string>): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    sendSignedTrialLicenseEmail(email: string, name: string, signedLicenseJson: string): Promise<boolean>;
    sendTrialLicenseEmail(name: string, email: string, signedLicenseJson: string): Promise<void>;
    setResendConfiguration(config: ResendConfiguration): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    submitUser(name: string, email: string): Promise<{
        __kind__: "alreadySubmitted";
        alreadySubmitted: {
            email: string;
        };
    } | {
        __kind__: "newUser";
        newUser: {
            message: string;
        };
    }>;
    testResendConnection(): Promise<EmailSendResult>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateAdminRole(email: string, newRole: AdminRole): Promise<Result>;
    updateEmailAutomationSettings(settings: EmailAutomationSettings): Promise<void>;
    updateFeatureStatus(featureId: string, isActive: boolean): Promise<void>;
    updateLicenseFeature(feature: LicenseFeature): Promise<void>;
    updateLicenseBundle(bundle: LicenseBundle): Promise<void>;
    updateBundleStatus(bundleId: string, isActive: boolean): Promise<void>;
    updateProduct(product: Product): Promise<void>;
    updatePurchaseFeatures(transactionId: string, features: Array<string>): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateResendServiceName(serviceName: string): Promise<void>;
    uploadFeatureImage(featureId: string, image: ExternalBlob): Promise<void>;
    uploadMacInstaller(file: ExternalBlob, fileName: string): Promise<boolean>;
    uploadPrivateKeyFile(file: ExternalBlob): Promise<void>;
    uploadTrialLicenseFile(file: ExternalBlob): Promise<void>;
    uploadWindowsInstaller(file: ExternalBlob, fileName: string): Promise<boolean>;
}
