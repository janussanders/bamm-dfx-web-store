import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
    email: string;
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
export type InstallerChunkResult = {
    __kind__: "ok";
    ok: {
        chunkIndex: bigint;
        chunk: Uint8Array;
        chunkCount: bigint;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface LicenseRequest {
    features: Array<string>;
    deliveryMethod: string;
    expirationDate: bigint;
    recipientEmail: string;
}
export interface AuditEntry {
    id: string;
    action: string;
    actorRole: string;
    target: string;
    timestamp: bigint;
    actorEmail: string;
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
        file: Uint8Array;
        mimeType: string;
        fileName: string;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface EntitlementWorkflowStep {
    step: string;
    message: string;
    timestamp: bigint;
    stripeSessionId?: string;
}
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
    entitlementId: string;
    paymentConfirmation: string;
    email: string;
    timestamp: bigint;
    stripeSessionId: string;
    amount: bigint;
    transactionId: string;
}
export interface LicenseFeature {
    id: string;
    featureType: string;
    licenseReferenceName: string;
    isPremium: boolean;
    name: string;
    description: string;
    isActive: boolean;
    image?: Uint8Array;
    priceInCents: bigint;
}
export interface LicenseBundle {
    featureIds: Array<string>;
    priceInCentsAnnual: bigint;
    bullets: Array<string>;
    sortOrder: bigint;
    headline: string;
    name: string;
    isActive: boolean;
    saveTextOverride: string;
    savingsCents: bigint;
    badge: string;
    disclaimer: string;
    bundleId: string;
    alaCarteSumCents: bigint;
}
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface InstallerMeta {
    mimeType: string;
    fileName: string;
    totalSize: bigint;
    chunkCount: bigint;
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
export interface ActivateEntitlementRequest {
    entitlementId: string;
    activationNonce: string;
    machineDigest: string;
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
export interface EntitlementRegistryEntry {
    purchasedAtIso: string;
    linkedPurchases: Array<LinkedPremiumPurchaseView>;
    updatedAtIso: string;
    workflowSteps: Array<EntitlementWorkflowStep>;
    entitlement: EntitlementStatusView;
}
export interface EntitlementStatusView {
    status: string;
    features: Array<string>;
    entitlementId: string;
    activationDeadlineIso: string;
    email: string;
    machineBindingDigest?: string;
    activationNonce: string;
    expiresIso?: string;
    activatedAtIso?: string;
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
export interface LinkedPremiumPurchaseView {
    customerName: string;
    purchasedAtIso: string;
    status: string;
    features: Array<string>;
    entitlementId: string;
    paymentConfirmation: string;
    stripeSessionId: string;
    amount: bigint;
    transactionId: string;
}
export interface LicenseRecord {
    features: Array<string>;
    deliveryStatus: string;
    expirationDate: bigint;
    licenseJson: string;
    generatedTimestamp: bigint;
    recipientEmail: string;
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
    activateEntitlement(request: ActivateEntitlementRequest): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addLicenseBundle(bundle: LicenseBundle): Promise<void>;
    addLicenseFeature(feature: LicenseFeature): Promise<void>;
    addProduct(product: Product): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignSuperAdmin(email: string): Promise<Result>;
    /**
     * / One-time admin backfill: create CustomerEntitlement rows from historical premiumPurchases.
     * / Stable upgrade only blanked PremiumPurchase.entitlementId (DDR-016); it never populated
     * / entitlementsByEmail. Eligible purchase.status: paid_sent / paid / complete / confirmed
     * / (fulfillment writes "confirmed" before email; many live rows stay there). Also accept
     * / paymentConfirmation == "paid" when status is ambiguous. Skips rows that already have a
     * / non-empty entitlementId. Fresh activation window starts at backfill time so old purchase
     * / timestamps do not instantly forfeit. Does not re-email licenses.
     */
    backfillEntitlementsFromPurchases(): Promise<{
        __kind__: "ok";
        ok: {
            registrySize: bigint;
            created: bigint;
            skippedNoFeatures: bigint;
            skippedIneligibleStatus: bigint;
            skippedAlreadyLinked: bigint;
            linked: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    beginMacInstallerUpload(fileName: string, totalSize: bigint, totalChunks: bigint): Promise<Result>;
    beginWindowsInstallerUpload(fileName: string, totalSize: bigint, totalChunks: bigint): Promise<Result>;
    bootstrapSuperAdmin(name: string, email: string): Promise<string>;
    cancelMacInstallerUpload(): Promise<void>;
    cancelWindowsInstallerUpload(): Promise<void>;
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
    deleteLicenseBundle(bundleId: string): Promise<void>;
    deleteLicenseFeature(featureId: string): Promise<void>;
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
    downloadMacInstallerChunk(chunkIndex: bigint): Promise<InstallerChunkResult>;
    downloadWindowsInstaller(): Promise<InstallerDownloadResult>;
    downloadWindowsInstallerChunk(chunkIndex: bigint): Promise<InstallerChunkResult>;
    elevateAdminRole(adminId: string, newRole: AdminRole): Promise<Result>;
    enableFeature(featureId: string): Promise<void>;
    finalizeMacInstallerUpload(): Promise<Result>;
    finalizeWindowsInstallerUpload(): Promise<Result>;
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
    getAllLicenseBundles(): Promise<Array<LicenseBundle>>;
    getAuditLog(limit: bigint): Promise<Array<AuditEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConfigurationStatus(): Promise<{
        stripeConfigured: boolean;
        privateKeyPresent: boolean;
        resendConfigured: boolean;
    }>;
    getCoreFeatures(): Promise<Array<LicenseFeature>>;
    getCustomerEntitlements(customerEmail: string): Promise<Array<EntitlementStatusView>>;
    getEmailAutomationSettings(): Promise<EmailAutomationSettings>;
    getEmailLogs(): Promise<Array<EmailLog>>;
    getEntitlementRegistry(): Promise<Array<EntitlementRegistryEntry>>;
    getEntitlementStatus(entitlementId: string, activationNonce: string): Promise<{
        __kind__: "ok";
        ok: EntitlementStatusView;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getInstallerChunkMaxBytes(): Promise<bigint>;
    /**
     * / Public metadata only (DDR-029) — file names for version display without downloading blobs.
     */
    getInstallerFileNames(): Promise<{
        windowsFileName?: string;
        macFileName?: string;
    }>;
    getLicenseBundles(): Promise<Array<LicenseBundle>>;
    getLicenseFeatures(): Promise<Array<LicenseFeature>>;
    getLicenseRecords(): Promise<Array<LicenseRecord>>;
    getLicenseReferenceNames(): Promise<Array<string>>;
    getLicensingPolicy(): Promise<{
        licenseTermDays: bigint;
        activationWindowDays: bigint;
        machineBindingAlgorithm: string;
    }>;
    getMacInstallerFile(): Promise<{
        file: Uint8Array;
        mimeType: string;
        fileName: string;
    } | null>;
    getMacInstallerMeta(): Promise<InstallerMeta | null>;
    getMyAdminRole(): Promise<string | null>;
    getPremiumFeatures(): Promise<Array<LicenseFeature>>;
    getPremiumPurchases(): Promise<Array<PremiumPurchase>>;
    getProducts(): Promise<Array<Product>>;
    getPublicMacInstallerMeta(): Promise<InstallerMeta | null>;
    getPublicWindowsInstallerMeta(): Promise<InstallerMeta | null>;
    getResendConfiguration(): Promise<ResendConfiguration | null>;
    getStripeSessionStatus(sessionId: string): Promise<Result_1>;
    getSuperAdminClaimCode(): Promise<string>;
    getTransactionLogs(): Promise<Array<TransactionLog>>;
    getTrialEligibleProductNames(): Promise<Array<string>>;
    getTrialLicenseFile(): Promise<Uint8Array | null>;
    getTrialLicensePayload(email: string): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSubmissions(): Promise<Array<UserSubmission>>;
    getWindowsInstallerFile(): Promise<{
        file: Uint8Array;
        mimeType: string;
        fileName: string;
    } | null>;
    getWindowsInstallerMeta(): Promise<InstallerMeta | null>;
    incrementDownloadCount(email: string): Promise<void>;
    initializeDefaultLicenseBundles(): Promise<void>;
    initializeDefaultCoreFeatures(): Promise<void>;
    initializeDefaultPremiumFeatures(): Promise<void>;
    inviteAdmin(name: string, email: string, role: AdminRole): Promise<Result>;
    isAdminByRole(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    issueTrialLicenseAndEmail(name: string, email: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
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
    /**
     * / Admin support: clear machine binding and return entitlement to pending_activation
     * / with a fresh activation window + nonce (so the customer can re-activate on a device).
     * / Does not delete the registry row or linked purchases. One row remains per email.
     */
    resetEntitlementActivation(entitlementId: string): Promise<{
        __kind__: "ok";
        ok: EntitlementStatusView;
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
    updateBundleStatus(bundleId: string, isActive: boolean): Promise<void>;
    updateEmailAutomationSettings(settings: EmailAutomationSettings): Promise<void>;
    updateFeatureStatus(featureId: string, isActive: boolean): Promise<void>;
    updateLicenseBundle(bundle: LicenseBundle): Promise<void>;
    updateLicenseFeature(feature: LicenseFeature): Promise<void>;
    updateProduct(product: Product): Promise<void>;
    updatePurchaseFeatures(transactionId: string, features: Array<string>): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateResendServiceName(serviceName: string): Promise<void>;
    uploadFeatureImage(featureId: string, image: Uint8Array): Promise<void>;
    /**
     * / Legacy single-shot upload — only for files ≤ chunk max. Prefer begin/chunk/finalize for DMG/EXE.
     */
    uploadMacInstaller(file: Uint8Array, fileName: string): Promise<boolean>;
    uploadMacInstallerChunk(chunkIndex: bigint, chunk: Uint8Array): Promise<Result>;
    uploadPrivateKeyFile(file: Uint8Array): Promise<void>;
    uploadPrivateKeyPem(pem: string): Promise<void>;
    uploadTrialLicenseFile(file: Uint8Array): Promise<void>;
    uploadWindowsInstaller(file: Uint8Array, fileName: string): Promise<boolean>;
    uploadWindowsInstallerChunk(chunkIndex: bigint, chunk: Uint8Array): Promise<Result>;
}
