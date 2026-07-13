import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Stripe "mo:caffeineai-stripe/stripe";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";

import Debug "mo:core/Debug";
import Error "mo:core/Error";
import Nat8 "mo:core/Nat8";
import Result "mo:core/Result";
import List "mo:core/List";
import Set "mo:core/Set";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Blob "mo:core/Blob";

import LicenseSigner "LicenseSigner";
import EntitlementMigration "EntitlementMigration";



























(with migration = EntitlementMigration.migration)
actor BAMM {
  // Access control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // DDR-003: Caffeine MixinObjectStorage removed — files stored as Motoko Blob (Option A lite).

  // ── RBAC Admin Role Types ────────────────────────────────────────────────

  public type AdminRole = {
    #superAdmin;
    #administrator;
    #featuresManager;
    #licenseGenerator;
  };

  public type AdminStatus = {
    #active;
    #pending;
    #deactivated;
  };

  public type AdminRecord = {
    id : Text;
    principal : ?Principal;
    name : Text;
    email : Text;
    role : AdminRole;
    status : AdminStatus;
    invitedBy : Text;
    invitedAt : Int;
    lastLogin : ?Int;
    tempPasswordHash : ?Text;
    tempPasswordExpiry : ?Int;
    isProtected : Bool;
  };

  public type AdminRecordPublic = {
    id : Text;
    principal : ?Principal;
    name : Text;
    email : Text;
    role : AdminRole;
    status : AdminStatus;
    invitedBy : Text;
    invitedAt : Int;
    lastLogin : ?Int;
    isProtected : Bool;
  };

  public type AuditEntry = {
    id : Text;
    actorEmail : Text;
    actorRole : Text;
    action : Text;
    target : Text;
    timestamp : Int;
  };

  // Data types
  public type UserSubmission = {
    name : Text;
    email : Text;
    timestamp : Int;
    downloadCount : Nat;
  };

  public type PremiumPurchase = EntitlementMigration.PremiumPurchase;

  public type EmailLog = {
    email : Text;
    subject : Text;
    sentTimestamp : Int;
    deliveryStatus : Text;
    errorMessage : ?Text;
  };

  public type PipelineStep = {
    step : Text;
    message : Text;
    timestamp : Int;
  };

  public type TransactionLog = {
    id : Text;             // Stripe session ID
    recipientEmail : Text;
    customerName : Text;
    transactionId : Text;  // BAMM-XXXX short ID
    features : [Text];
    amountPaid : Text;     // dollars as Text, e.g. "0.52"
    licenseStatus : Text;  // "sent" | "failed" | "pending"
    createdAt : Int;
    updatedAt : Int;
    pipelineSteps : [PipelineStep];
  };

  public type Product = {
    id : Text;
    name : Text;
    description : Text;
    priceInCents : Nat;
    currency : Text;
    isPremium : Bool;
    isActive : Bool;
    imageUrl : ?Text;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type EmailAutomationSettings = {
    emailSubject : Text;
    emailBody : Text;
  };

  public type LicenseFeature = {
    id : Text;
    name : Text;
    description : Text;
    isPremium : Bool;
    isActive : Bool;
    priceInCents : Nat;
    image : ?Blob;
    featureType : Text;
    // Canonical name used in RSA license payloads — must match BAMM desktop app validation.
    // If empty, falls back to `name`. Set this to one of the six canonical names:
    // "Paycheck Budget", "Goals", "Tx Simulator", "Migration Management",
    // "Database Management", "Trades"
    licenseReferenceName : Text;
  };

  public type LicenseBundle = {
    bundleId : Text;
    name : Text;
    priceInCentsAnnual : Nat;
    featureIds : [Text];
    headline : Text;
    bullets : [Text];
    badge : Text;
    saveTextOverride : Text;
    disclaimer : Text;
    alaCarteSumCents : Nat;
    savingsCents : Nat;
    isActive : Bool;
    sortOrder : Nat;
  };

  public type LicenseRequest = {
    features : [Text];
    recipientEmail : Text;
    expirationDate : Int;
    deliveryMethod : Text;
  };

  public type LicenseRecord = {
    licenseJson : Text;
    recipientEmail : Text;
    features : [Text];
    expirationDate : Int;
    generatedTimestamp : Int;
    deliveryStatus : Text;
  };

  public type EntitlementStatus = {
    #pending_activation;
    #activated;
    #forfeited;
    #expired;
  };

  public type CustomerEntitlement = {
    entitlementId : Text;
    email : Text;
    features : [Text];
    purchasedAtNs : Int;
    activationDeadlineNs : Int;
    activatedAtNs : ?Int;
    expiresAtNs : ?Int;
    machineBindingDigest : ?Text;
    activationNonce : Text;
    status : EntitlementStatus;
    updatedAtNs : Int;
  };

  public type ActivateEntitlementRequest = {
    entitlementId : Text;
    machineDigest : Text;
    activationNonce : Text;
  };

  public type EntitlementStatusView = {
    entitlementId : Text;
    email : Text;
    features : [Text];
    status : Text;
    activationDeadlineIso : Text;
    activatedAtIso : ?Text;
    expiresIso : ?Text;
    machineBindingDigest : ?Text;
    activationNonce : Text;
  };

  public type LinkedPremiumPurchaseView = {
    transactionId : Text;
    stripeSessionId : Text;
    amount : Nat;
    status : Text;
    paymentConfirmation : Text;
    features : [Text];
    customerName : Text;
    purchasedAtIso : Text;
    entitlementId : Text;
  };

  public type EntitlementWorkflowStep = {
    step : Text;
    message : Text;
    timestamp : Int;
    stripeSessionId : ?Text;
  };

  public type EntitlementRegistryEntry = {
    entitlement : EntitlementStatusView;
    purchasedAtIso : Text;
    updatedAtIso : Text;
    linkedPurchases : [LinkedPremiumPurchaseView];
    workflowSteps : [EntitlementWorkflowStep];
  };

  public type ResendConfiguration = {
    apiKey : Text;
    baseUrl : Text;
    senderEmail : Text;
    serviceName : Text;
  };

  public type InstallerDownloadResult = {
    #ok : {
      file : Blob;
      fileName : Text;
      mimeType : Text;
    };
    #err : Text;
  };

  /// DDR-003: chunked installer metadata (survives upgrades; bytes live in `chunks`).
  public type InstallerMeta = {
    fileName : Text;
    mimeType : Text;
    totalSize : Nat;
    chunkCount : Nat;
  };

  public type InstallerChunkResult = {
    #ok : {
      chunk : Blob;
      chunkIndex : Nat;
      chunkCount : Nat;
    };
    #err : Text;
  };

  public type EmailSendResult = {
    #ok : Text;
    #err : Text;
  };

  // Data storage
  var userSubmissions = Map.empty<Text, UserSubmission>();
  var premiumPurchases = Map.empty<Text, PremiumPurchase>();
  var emailLogs = Map.empty<Text, EmailLog>();
  var products = Map.empty<Text, Product>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var licenseFeatures = Map.empty<Text, LicenseFeature>();
  var licenseBundles = Map.empty<Text, LicenseBundle>();
  var licenseRecords = Map.empty<Text, LicenseRecord>();
  var entitlementsByEmail = Map.empty<Text, CustomerEntitlement>();
  var emailByEntitlementId = Map.empty<Text, Text>();
  var entitlementWorkflowLogs = Map.empty<Text, [EntitlementWorkflowStep]>();

  // Licensing policy (@bamm/contracts/data/licensing-policy.json)
  let activationWindowDays : Int = 30;
  let licenseTermDays : Int = 365;
  let nsPerDay : Int = 24 * 60 * 60 * 1_000_000_000;

  // Session ownership tracking
  var sessionOwners = Map.empty<Text, Principal>();
  // Features resolved at checkout creation — reliable fallback when Stripe line_items JSON is sparse
  var sessionPurchasedFeatures = Map.empty<Text, [Text]>();

  // Transaction logs — keyed by Stripe session ID
  var transactionLogs = Map.empty<Text, TransactionLog>();

  // ── RBAC Admin State ─────────────────────────────────────────────────────
  // Keyed by email address
  var adminRecords = Map.empty<Text, AdminRecord>();
  var auditLogEntries : List.List<AuditEntry> = List.empty<AuditEntry>();
  var adminBootstrapped : Bool = false;

  // ── Super Admin Claim Flow ────────────────────────────────────────────────
  // One-time claim code that allows a new Internet Identity principal to register
  // as Super Admin. Persists across redeploys (EOP). Cleared after first use.
  var superAdminClaimCode : Text = "BAMM" # Int.abs(Time.now()).toText();
  var superAdminClaimUsed : Bool = false;

  // Email automation settings
  var emailAutomationSettings : EmailAutomationSettings = {
    emailSubject = "Your BAMM 30-Day Trial License";
    emailBody = "Thank you for downloading BAMM. Your 30-day trial license is attached.\n\nTrial includes core premium tools. Trades and Tx Simulator require a separate annual license.\n\nYour financial records stay on your device.";
  };

  // 30-day trial license file reference
  var trialLicenseFile : ?Blob = null;

  // Stripe configuration
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  // RSA private key — PEM stored on-canister for server-side signing only (never queryable).
  var privateKeyPem : ?Text = null;
  // Legacy object-storage reference; retained for migration visibility only.
  var privateKeyFile : ?Blob = null;

  // submitUser abuse controls (0.S5)
  var submitUserLastAttempt = Map.empty<Text, Int>();
  var submitUserHourBucket : Int = 0;
  var submitUserHourCount : Nat = 0;
  let submitUserCooldownNs : Int = 60 * 1_000_000_000;
  let submitUserHourlyMax : Nat = 50;

  // RESEND configuration
  let defaultSenderEmail = "jay.hughes@contact.bammservice.com";
  var resendConfig : ?ResendConfiguration = ?{
    apiKey = "";
    baseUrl = "https://api.resend.com";
    senderEmail = defaultSenderEmail;
    serviceName = "BAMM_Email";
  };

  // Installer files with metadata
  var macInstallerFile : ?{
    file : Blob;
    fileName : Text;
    mimeType : Text;
  } = null;

  var windowsInstallerFile : ?{
    file : Blob;
    fileName : Text;
    mimeType : Text;
  } = null;

  // ── RBAC Helper Functions ────────────────────────────────────────────────

  func roleTier(role : AdminRole) : Nat {
    switch (role) {
      case (#superAdmin)       { 0 };
      case (#administrator)    { 1 };
      case (#featuresManager)  { 2 };
      case (#licenseGenerator) { 3 };
    };
  };

  func roleToText(role : AdminRole) : Text {
    switch (role) {
      case (#superAdmin)       { "superAdmin" };
      case (#administrator)    { "administrator" };
      case (#featuresManager)  { "featuresManager" };
      case (#licenseGenerator) { "licenseGenerator" };
    };
  };

  func findAdminByPrincipal(p : Principal) : ?AdminRecord {
    for ((_email, record) in adminRecords.entries()) {
      switch (record.principal) {
        case (?rp) {
          if (rp == p and record.status == #active) { return ?record };
        };
        case null {};
      };
    };
    null;
  };

  private func isAdmin(p : Principal) : Bool {
    if (AccessControl.hasPermission(accessControlState, p, #admin)) { return true };
    switch (findAdminByPrincipal(p)) {
      case (?record) { record.status == #active };
      case null { false };
    };
  };

  func appendAuditLog(actorEmail : Text, actorRole : Text, action : Text, target : Text) {
    let now = Time.now();
    let entry : AuditEntry = {
      id = actorEmail # "-" # now.toText();
      actorEmail;
      actorRole;
      action;
      target;
      timestamp = now;
    };
    auditLogEntries.add(entry);
  };

  func requireAdminRole(caller : Principal, minRole : AdminRole) : AdminRecord {
    switch (findAdminByPrincipal(caller)) {
      case null { Runtime.trap("Insufficient admin privileges") };
      case (?record) {
        if (record.status != #active) { Runtime.trap("Admin account is not active") };
        if (roleTier(record.role) > roleTier(minRole)) {
          Runtime.trap("Insufficient admin privileges");
        };
        record;
      };
    };
  };

  // Simplified deterministic hash placeholder (real SHA-256 not available in standard Motoko).
  // This encodes length + input, providing uniqueness for temp password verification.
  func sha256Text(input : Text) : Text {
    "sha256-" # input.size().toText() # "-" # input;
  };

  // Generates a 12-character alphanumeric temp password using timestamp entropy.
  func generateTempPassword() : Text {
    let now = Time.now();
    let t = Int.abs(now);
    let charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let charArray = Array.fromIter(charset.chars());
    let base = charArray.size();
    var n = t;
    var result = "";
    var count = 0;
    while (count < 12) {
      let idx = n % base;
      result #= Text.fromChar(charArray[idx]);
      n := (n / base + count * 31 + 7) % 999983;
      count += 1;
    };
    result;
  };

  // Bootstrap the first super admin from the existing access control state.
  // Called lazily whenever an admin list is needed and not yet bootstrapped.
  func maybeBootstrapSuperAdmin() {
    // Auto-bootstrap via AccessControl.getEntries is not available.
    // Super Admin bootstrapping is handled explicitly via bootstrapSuperAdmin().
    if (adminBootstrapped) { return };
  };

  // ── RBAC Public Endpoints ─────────────────────────────────────────────────

  // Returns the caller's admin role text if they are an active admin, else null.
  public query ({ caller }) func getMyAdminRole() : async ?Text {
    // Primary lookup: find by linked principal
    switch (findAdminByPrincipal(caller)) {
      case (?record) { return ?roleToText(record.role) };
      case null {};
    };
    // Fallback: caller is recognized by the legacy AccessControl system as admin
    // (e.g. their principal is linked to the canister's admin role but their
    // RBAC adminRecords entry uses a different / unlinked principal).
    // In this application the legacy AccessControl admin IS the Super Admin, so
    // return "superAdmin" so the frontend isSuperAdmin flag is set correctly.
    if (isAdmin(caller)) {
      return ?"superAdmin";
    };
    null;
  };

  // Returns true if the caller is an active admin under RBAC (any role).
  public query ({ caller }) func isAdminByRole() : async Bool {
    switch (findAdminByPrincipal(caller)) {
      case null { false };
      case (?_) { true };
    };
  };

  // Lists all admin records (public fields only).
  public shared ({ caller }) func listAdmins() : async [AdminRecordPublic] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can list admin records");
    };
    maybeBootstrapSuperAdmin();
    let result = List.empty<AdminRecordPublic>();
    for ((_email, record) in adminRecords.entries()) {
      result.add({
        id = record.id;
        principal = record.principal;
        name = record.name;
        email = record.email;
        role = record.role;
        status = record.status;
        invitedBy = record.invitedBy;
        invitedAt = record.invitedAt;
        lastLogin = record.lastLogin;
        isProtected = record.isProtected;
      });
    };
    result.toArray();
  };

  // Invites a new admin by email. Generates a temp password and sends an invite email.
  public shared ({ caller }) func inviteAdmin(name : Text, email : Text, role : AdminRole) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can invite other admins");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #featuresManager); // any active admin can call

    // Enforce invitation tier rules: admins can only invite lower tiers
    if (roleTier(role) <= roleTier(callerRecord.role) and callerRecord.role != #superAdmin) {
      return #err("Insufficient privileges: you can only invite admins at a lower tier than your own");
    };

    // Check if email already exists
    switch (adminRecords.get(email)) {
      case (?_existing) {
        return #err("An admin record for this email already exists");
      };
      case null {};
    };

    let tempPw = generateTempPassword();
    let tempHash = sha256Text(tempPw);
    let expiry = Time.now() + 24 * 60 * 60 * 1_000_000_000; // 24 hours

    let record : AdminRecord = {
      id = email # "-" # Time.now().toText();
      principal = null;
      name;
      email;
      role;
      status = #pending;
      invitedBy = callerRecord.email;
      invitedAt = Time.now();
      lastLogin = null;
      tempPasswordHash = ?tempHash;
      tempPasswordExpiry = ?expiry;
      isProtected = false;
    };
    adminRecords.add(email, record);

    // Send invite email via RESEND (plain email — no attachment)
    let roleText = roleToText(role);
    let inviteSubject = "You've been invited to BAMM Admin Panel";
    let inviteBody = "Hello " # name # ",\n\n" #
      "You have been invited to join the BAMM SERVICES INC. admin panel.\n" #
      "Your role: " # roleText # "\n\n" #
      "--------------------\n" #
      "ACTIVATE YOUR ADMIN ACCOUNT\n" #
      "--------------------\n\n" #
      "Click here to activate your account:\n" #
      "https://store.bammservice.com/admin/accept-invite\n\n" #
      "Your invite email: " # email # "\n" #
      "Your temporary password: " # tempPw # "\n\n" #
      "INSTRUCTIONS:\n" #
      "1. Click the link above (or copy it into your browser)\n" #
      "2. Log in with Internet Identity if prompted\n" #
      "3. Enter your invite email (" # email # ") and the temporary password above\n" #
      "4. Your account will be activated immediately\n\n" #
      "This temporary password expires in 24 hours. If it expires, ask an admin to re-invite you.\n\n" #
      "BAMM SERVICES INC.";
    // Send invite email — admin record persists regardless of email outcome
    let emailResult = try {
      await sendPlainEmailWithResend(email, inviteSubject, inviteBody);
    } catch (e) {
      #err("Email outcall failed: " # e.message());
    };

    appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "invite_admin", email # " as " # roleText);

    switch (emailResult) {
      case (#ok(_)) { #ok("Invitation sent to " # email) };
      case (#err(errMsg)) { #err("Admin record created but email failed: " # errMsg) };
    };
  };

  // Claims an admin invite using email + temp password. Links the caller's principal.
  public shared ({ caller }) func claimAdminInvite(email : Text, tempPassword : Text) : async Result.Result<Text, Text> {
    switch (adminRecords.get(email)) {
      case null { return #err("No pending admin invite found for this email") };
      case (?record) {
        if (record.status != #pending) {
          return #err("Invite already claimed or account is not in pending state");
        };
        switch (record.tempPasswordHash) {
          case null { return #err("No temp password set for this invite") };
          case (?storedHash) {
            if (sha256Text(tempPassword) != storedHash) {
              return #err("Invalid temporary password");
            };
          };
        };
        switch (record.tempPasswordExpiry) {
          case null {};
          case (?expiry) {
            if (Time.now() > expiry) {
              return #err("Temporary password has expired. Please request a new invite.");
            };
          };
        };
        // Claim the invite — link principal and activate
        let updated : AdminRecord = {
          record with
          principal = ?caller;
          status = #active;
          tempPasswordHash = null;
          tempPasswordExpiry = null;
          lastLogin = ?Time.now();
        };
        adminRecords.add(email, updated);
        appendAuditLog(email, roleToText(record.role), "claim_invite", email);
        #ok("Admin access granted for " # email);
      };
    };
  };

  // Updates an admin's role (Super Admin only).
  // Super Admins may assign any role including #superAdmin; non-super admins cannot assign #superAdmin.
  public shared ({ caller }) func updateAdminRole(email : Text, newRole : AdminRole) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can update admin roles");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #superAdmin);
    // Prevent assigning #superAdmin unless the caller is already a Super Admin
    if (newRole == #superAdmin and callerRecord.role != #superAdmin) {
      return #err("Insufficient privileges: only a Super Admin can assign the Super Admin role");
    };
    switch (adminRecords.get(email)) {
      case null { return #err("Admin record not found for: " # email) };
      case (?record) {
        // Protect the original system super admin from any modification
        if (record.isProtected) {
          return #err("Cannot modify the original system super admin");
        };
        // Protect existing Super Admin records from role changes by non-super-admins
        if (record.role == #superAdmin and callerRecord.role != #superAdmin) {
          return #err("Cannot change the role of a Super Admin");
        };
        let updated : AdminRecord = { record with role = newRole };
        adminRecords.add(email, updated);
        appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "update_role", email # " -> " # roleToText(newRole));
        #ok("Role updated for " # email);
      };
    };
  };

  // Deactivates an admin account.
  public shared ({ caller }) func deactivateAdmin(email : Text) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can deactivate admin accounts");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #administrator);
    switch (adminRecords.get(email)) {
      case null { return #err("Admin record not found for: " # email) };
      case (?record) {
        if (record.isProtected) {
          return #err("Cannot modify the original system super admin");
        };
        // Non-super admins can only deactivate lower tiers
        if (callerRecord.role != #superAdmin and roleTier(record.role) <= roleTier(callerRecord.role)) {
          return #err("Cannot deactivate an admin at the same or higher tier");
        };
        let updated : AdminRecord = { record with status = #deactivated };
        adminRecords.add(email, updated);
        appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "deactivate_admin", email);
        #ok("Admin deactivated: " # email);
      };
    };
  };

  // Reactivates a deactivated admin account (Super Admin only).
  public shared ({ caller }) func reactivateAdmin(email : Text) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can reactivate admin accounts");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #superAdmin);
    switch (adminRecords.get(email)) {
      case null { return #err("Admin record not found for: " # email) };
      case (?record) {
        let updated : AdminRecord = { record with status = #active };
        adminRecords.add(email, updated);
        appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "reactivate_admin", email);
        #ok("Admin reactivated: " # email);
      };
    };
  };

  // Deletes an admin record (Super Admin only). Cannot delete self or another Super Admin.
  public shared ({ caller }) func deleteAdmin(email : Text) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can delete admin records");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #superAdmin);
    if (callerRecord.email == email) {
      return #err("Cannot delete your own admin account");
    };
    switch (adminRecords.get(email)) {
      case null { return #err("Admin record not found for: " # email) };
      case (?record) {
        if (record.isProtected) {
          return #err("Cannot modify the original system super admin");
        };
        adminRecords.remove(email);
        appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "delete_admin", email);
        #ok("Admin deleted: " # email);
      };
    };
  };

  // Returns audit log entries (most recent first, up to limit or 500).
  public query ({ caller }) func getAuditLog(limit : Nat) : async [AuditEntry] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view the audit log");
    };
    let maxEntries = if (limit > 500) { 500 } else { limit };
    let all = auditLogEntries.toArray();
    let total = all.size();
    let take = if (total < maxEntries) { total } else { maxEntries };
    // Slice the last `take` entries then reverse for most-recent-first
    let startIdx = total - take;
    let sliced = all.sliceToArray(startIdx, startIdx + take);
    sliced.reverse();
  };

  // Bootstrap the Super Admin record on demand (admin-only call for first-time setup).
  // Accepts the real name and email for the super admin instead of hardcoded defaults.
  public shared ({ caller }) func bootstrapSuperAdmin(name : Text, email : Text) : async Text {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can bootstrap super admin");
    };
    if (adminBootstrapped) {
      return "Super Admin already bootstrapped";
    };
    let p = caller;
    let superAdminRecord : AdminRecord = {
      id = "super-admin-bootstrap";
      principal = ?p;
      name;
      email;
      role = #superAdmin;
      status = #active;
      invitedBy = "system";
      invitedAt = Time.now();
      lastLogin = null;
      tempPasswordHash = null;
      tempPasswordExpiry = null;
      isProtected = true;
    };
    adminRecords.add(email, superAdminRecord);
    adminBootstrapped := true;
    appendAuditLog("system", "system", "bootstrap_super_admin", p.toText() # " (" # email # ")");
    "Super Admin bootstrapped for principal: " # p.toText();
  };

  // Assigns the Super Admin role to an existing admin (Super Admin caller only).
  public shared ({ caller }) func assignSuperAdmin(email : Text) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can assign Super Admin role");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #superAdmin);
    if (callerRecord.email == email) {
      return #err("You are already a Super Admin");
    };
    switch (adminRecords.get(email)) {
      case null { return #err("Admin record not found for: " # email) };
      case (?record) {
        if (record.role == #superAdmin) {
          return #err("Already a Super Admin");
        };
        let updated : AdminRecord = { record with role = #superAdmin };
        adminRecords.add(email, updated);
        appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "assign_superadmin", email);
        #ok("Super Admin role assigned to " # email);
      };
    };
  };

  // Elevates an existing admin to a higher-tier role (Super Admin only).
  // Generates a new one-time temp password, sets the record to pending,
  // and sends a RESEND email with the new role and claim instructions.
  public shared ({ caller }) func elevateAdminRole(adminId : Text, newRole : AdminRole) : async Result.Result<Text, Text> {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can elevate admin roles");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #superAdmin);

    // Cannot elevate to or above a protected Super Admin row
    // (newRole must be a HIGHER tier — numerically lower tier number than current)
    switch (adminRecords.get(adminId)) {
      case null { return #err("Admin record not found for: " # adminId) };
      case (?record) {
        if (record.isProtected) {
          return #err("Cannot modify the original system super admin");
        };
        if (roleTier(newRole) >= roleTier(record.role)) {
          return #err("New role must be a higher tier (lower tier number) than the current role");
        };
        // Generate a new one-time temp password
        let tempPw = generateTempPassword();
        let tempHash = sha256Text(tempPw);
        let expiry = Time.now() + 86_400_000_000_000; // 24 hours in nanoseconds

        let oldRoleText = roleToText(record.role);
        let newRoleText = roleToText(newRole);

        let updated : AdminRecord = {
          record with
          role = newRole;
          status = #pending;
          tempPasswordHash = ?tempHash;
          tempPasswordExpiry = ?expiry;
        };
        adminRecords.add(adminId, updated);

        // Send elevation notification email via RESEND (no attachment)
        let elevationSubject = "Your BAMM admin role has been elevated";
        let elevationBody =
          "Hello " # record.name # ",\n\n" #
          "Your admin role at BAMM SERVICES INC. has been elevated.\n\n" #
          "Previous role: " # oldRoleText # "\n" #
          "New role: " # newRoleText # "\n\n" #
          "--------------------\n" #
          "ACTIVATE YOUR ELEVATED ROLE\n" #
          "--------------------\n\n" #
          "Click here to activate your elevated role:\n" #
          "https://store.bammservice.com/admin/accept-invite\n\n" #
          "Your admin email: " # record.email # "\n" #
          "Your temporary password: " # tempPw # "\n\n" #
          "INSTRUCTIONS:\n" #
          "1. Click the link above (or copy it into your browser)\n" #
          "2. Log in with Internet Identity if prompted\n" #
          "3. Enter your admin email (" # record.email # ") and the temporary password above\n" #
          "4. Your elevated role will be activated immediately\n\n" #
          "This temporary password expires in 24 hours.\n\n" #
          "BAMM SERVICES INC.";

        let emailResult = try {
          await sendPlainEmailWithResend(record.email, elevationSubject, elevationBody);
        } catch (e) {
          #err("Email outcall failed: " # e.message());
        };

        appendAuditLog(
          callerRecord.email,
          roleToText(callerRecord.role),
          "elevate_role",
          adminId # ": " # oldRoleText # " -> " # newRoleText
        );

        switch (emailResult) {
          case (#ok(_)) { #ok("Role elevated and notification sent to " # record.email) };
          case (#err(errMsg)) { #err("Role elevated but email failed: " # errMsg) };
        };
      };
    };
  };

  // Claims a role elevation using the caller's II principal + temp password.
  // Finds a pending admin record whose temp password hash matches and is not expired.
  // On match: activates the record and clears the temp password fields.
  public shared ({ caller }) func claimRoleElevation(tempPassword : Text) : async Result.Result<Text, Text> {
    let now = Time.now();
    let inputHash = sha256Text(tempPassword);

    // Scan all admin records for a pending elevation that matches the temp password
    var matchedEmail : ?Text = null;
    for ((email, record) in adminRecords.entries()) {
      if (record.status == #pending) {
        switch (record.tempPasswordHash) {
          case (?storedHash) {
            if (storedHash == inputHash) {
              switch (record.tempPasswordExpiry) {
                case (?expiry) {
                  if (now <= expiry) {
                    matchedEmail := ?email;
                  };
                };
                case null {};
              };
            };
          };
          case null {};
        };
      };
    };

    switch (matchedEmail) {
      case null { return #err("No valid pending elevation found for this temp password") };
      case (?email) {
        switch (adminRecords.get(email)) {
          case null { return #err("Admin record disappeared unexpectedly") };
          case (?record) {
            let activated : AdminRecord = {
              record with
              principal = ?caller;
              status = #active;
              tempPasswordHash = null;
              tempPasswordExpiry = null;
              lastLogin = ?now;
            };
            adminRecords.add(email, activated);
            appendAuditLog(email, roleToText(record.role), "claim_elevation", roleToText(record.role));
            #ok(roleToText(record.role));
          };
        };
      };
    };
  };

  // Returns the one-time super admin claim code. Requires active admin authentication.
  // Returns "ALREADY_CLAIMED" if used. If no admin can log in, the claim code is
  // visible in the canister logs at init time (search for "BAMM-CLAIM-CODE").
  public query ({ caller }) func getSuperAdminClaimCode() : async Text {
    // Require at least an active admin (any tier) to read the claim code
    switch (findAdminByPrincipal(caller)) {
      case null {
        // If no admins exist yet (first-time setup), allow reading the code
        // so the very first admin can claim super admin.
        var anyActive = false;
        for ((_email, record) in adminRecords.entries()) {
          if (record.status == #active) { anyActive := true };
        };
        if (anyActive) {
          Runtime.trap("Unauthorized: Only active admins can read the claim code");
        };
      };
      case (?record) {
        if (record.status != #active) {
          Runtime.trap("Unauthorized: Only active admins can read the claim code");
        };
      };
    };
    if (superAdminClaimUsed) { return "ALREADY_CLAIMED" };
    superAdminClaimCode;
  };

  // Allows a new Internet Identity principal to claim Super Admin access using the
  // one-time claim code. Used when an admin has a new II principal and needs to
  // re-register without losing access.
  public shared (msg) func claimSuperAdmin(code : Text, name : Text, email : Text) : async Result.Result<Text, Text> {
    // Check code not already used
    if (superAdminClaimUsed) {
      return #err("Claim code has already been used");
    };
    // Validate the claim code
    if (code != superAdminClaimCode) {
      return #err("Invalid claim code");
    };
    // Check if this principal is already a Super Admin
    switch (findAdminByPrincipal(msg.caller)) {
      case (?record) {
        if (record.role == #superAdmin) {
          return #err("You are already a Super Admin");
        };
      };
      case null {};
    };
    // Create the new Super Admin record
    let now = Time.now();
    let newId = "super-admin-claim-" # now.toText();
    let superAdminRecord : AdminRecord = {
      id = newId;
      principal = ?msg.caller;
      name;
      email;
      role = #superAdmin;
      status = #active;
      invitedBy = "system-claim";
      invitedAt = now;
      lastLogin = ?now;
      tempPasswordHash = null;
      tempPasswordExpiry = null;
      isProtected = false;
    };
    adminRecords.add(email, superAdminRecord);
    superAdminClaimUsed := true;
    superAdminClaimCode := "";
    adminBootstrapped := true;
    appendAuditLog("system-claim", "Super Admin", "SUPER_ADMIN_CLAIMED", email);
    #ok("Super Admin access granted. Welcome to BAMM!");
  };

  // Regenerates the Super Admin claim code. Super Admin only.
  // Resets superAdminClaimUsed to false and generates a new code, enabling
  // a second (or subsequent) Super Admin to be activated via the claim flow.
  public shared ({ caller }) func regenerateSuperAdminClaimCode() : async Result.Result<Text, Text> {
    let callerRecord = requireAdminRole(caller, #superAdmin);
    let newCode = "BAMM" # Int.abs(Time.now()).toText();
    superAdminClaimCode := newCode;
    superAdminClaimUsed := false;
    appendAuditLog(callerRecord.email, roleToText(callerRecord.role), "CLAIM_CODE_REGENERATED", "Super Admin claim code regenerated");
    #ok(newCode);
  };

  // Returns the pending invite linked to the caller's principal, if any.
  // Searches adminRecords for a record where principal == ?caller AND status == #pending.
  public query ({ caller }) func checkMyPendingInvite() : async ?{ email : Text; role : Text } {
    for ((_key, record) in adminRecords.entries()) {
      switch (record.principal) {
        case (?rp) {
          if (rp == caller and record.status == #pending) {
            return ?{ email = record.email; role = roleToText(record.role) };
          };
        };
        case null {};
      };
    };
    null;
  };

  // Returns pending invite info to help route newly-logged-in II principals.
  // - If the caller's principal is already linked to a pending invite: returns that invite's email and role.
  // - If the caller's principal has no match but unlinked pending invites exist: returns hasUnlinked=true (no email revealed).
  // - Otherwise returns null.
  public query ({ caller }) func checkAnyPendingInvite() : async ?{ email : ?Text; role : Text; hasUnlinked : Bool } {
    // First check: is this principal already linked to a pending invite?
    for ((_key, record) in adminRecords.entries()) {
      switch (record.principal) {
        case (?rp) {
          if (rp == caller and record.status == #pending) {
            return ?{ email = ?record.email; role = roleToText(record.role); hasUnlinked = false };
          };
        };
        case null {};
      };
    };
    // Second check: are there any unlinked pending invites?
    for ((_key, record) in adminRecords.entries()) {
      if (record.principal == null and record.status == #pending) {
        return ?{ email = null; role = "pending"; hasUnlinked = true };
      };
    };
    null;
  };

  // User profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // User submissions - public for free download flow (no authentication required per spec)
  // This is intentionally public as per specification: "No account creation required for free downloads"
  public shared func submitUser(name : Text, email : Text) : async {
    #newUser : { message : Text };
    #alreadySubmitted : { email : Text };
  } {
    let nowNs = Time.now();
    let hourBucket = nowNs / (3600 * 1_000_000_000);
    if (hourBucket != submitUserHourBucket) {
      submitUserHourBucket := hourBucket;
      submitUserHourCount := 0;
    };
    if (submitUserHourCount >= submitUserHourlyMax) {
      Runtime.trap("Rate limit exceeded. Please try again later.");
    };

    switch (userSubmissions.get(email)) {
      case (?_existing) {
        // Email already in submissions — do not resend, just return the email so the
        // frontend can show the friendly "already generated" notice.
        return #alreadySubmitted { email };
      };
      case null {};
    };

    switch (submitUserLastAttempt.get(email)) {
      case (?last) {
        if (nowNs - last < submitUserCooldownNs) {
          Runtime.trap("Please wait before submitting again.");
        };
      };
      case null {};
    };
    submitUserLastAttempt.add(email, nowNs);
    submitUserHourCount += 1;

    let submission : UserSubmission = {
      name;
      email;
      timestamp = Time.now();
      downloadCount = 0;
    };
    userSubmissions.add(email, submission);

    // License generation and email delivery is handled by issueTrialLicenseAndEmail().
    #newUser {
      message = "Welcome to BAMM, " # name # "! Your 30-day free trial license has been generated and sent to " # email # ". Please check your inbox to get started!";
    };
  };

  public shared ({ caller }) func incrementDownloadCount(email : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can increment download counts");
    };
    switch (userSubmissions.get(email)) {
      case null {};
      case (?submission) {
        let updatedSubmission : UserSubmission = {
          name = submission.name;
          email = submission.email;
          timestamp = submission.timestamp;
          downloadCount = submission.downloadCount + 1;
        };
        userSubmissions.add(email, updatedSubmission);
      };
    };
  };

  public query ({ caller }) func getUserSubmissions() : async [UserSubmission] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view all user submissions");
    };
    userSubmissions.values().toArray();
  };

  // Delete user submission (admin-only)
  public shared ({ caller }) func deleteUserSubmission(email : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete user submissions");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    userSubmissions.remove(email);
  };

  // Premium purchases - internal recording for automated system
  func premiumPurchaseStorageKey(stripeSessionId : Text, transactionId : Text) : Text {
    if (stripeSessionId.size() > 0) { stripeSessionId } else { transactionId };
  };

  func recordPremiumPurchaseInternal(
    email : Text,
    transactionId : Text,
    amount : Nat,
    status : Text,
    customerName : Text,
    stripeSessionId : Text,
    paymentConfirmation : Text,
    features : [Text],
    entitlementId : Text,
  ) {
    let purchase : PremiumPurchase = {
      email;
      transactionId;
      amount;
      timestamp = Time.now();
      status;
      customerName;
      stripeSessionId;
      paymentConfirmation;
      features;
      entitlementId;
    };
    premiumPurchases.add(premiumPurchaseStorageKey(stripeSessionId, transactionId), purchase);
  };

  func appendEntitlementWorkflowLog(
    entitlementId : Text,
    step : Text,
    message : Text,
    stripeSessionId : ?Text,
  ) {
    let now = Time.now();
    let entry : EntitlementWorkflowStep = {
      step;
      message;
      timestamp = now;
      stripeSessionId;
    };
    let existing = switch (entitlementWorkflowLogs.get(entitlementId)) {
      case (?steps) { steps };
      case null { [] };
    };
    let combined = existing.concat([entry]);
    let trimmed = if (combined.size() > 50) {
      Array.tabulate<EntitlementWorkflowStep>(
        50,
        func(i : Nat) { combined[combined.size() - 50 + i] },
      );
    } else {
      combined;
    };
    entitlementWorkflowLogs.add(entitlementId, trimmed);
    appendAuditLog("system", "entitlement_workflow", step, entitlementId # ": " # message);
  };

  func purchaseToLinkedView(purchase : PremiumPurchase) : LinkedPremiumPurchaseView {
    {
      transactionId = purchase.transactionId;
      stripeSessionId = purchase.stripeSessionId;
      amount = purchase.amount;
      status = purchase.status;
      paymentConfirmation = purchase.paymentConfirmation;
      features = purchase.features;
      customerName = purchase.customerName;
      purchasedAtIso = nowNsToIso(purchase.timestamp);
      entitlementId = purchase.entitlementId;
    };
  };

  func linkedPurchasesForEntitlement(emailKey : Text, entitlementId : Text) : [LinkedPremiumPurchaseView] {
    let allPurchases = premiumPurchases.values().toArray();
    allPurchases
      .filter(func(p : PremiumPurchase) : Bool {
        normalizeEmail(p.email) == emailKey
        or (p.entitlementId.size() > 0 and p.entitlementId == entitlementId);
      })
      .map(purchaseToLinkedView);
  };

  public shared ({ caller }) func recordPremiumPurchase(email : Text, transactionId : Text, amount : Nat, status : Text, customerName : Text, stripeSessionId : Text, paymentConfirmation : Text, features : [Text]) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can manually record purchases");
    };
    recordPremiumPurchaseInternal(email, transactionId, amount, status, customerName, stripeSessionId, paymentConfirmation, features, "");
  };

  public query ({ caller }) func getPremiumPurchases() : async [PremiumPurchase] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view all purchases");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    premiumPurchases.values().toArray();
  };

  // --- TransactionLog helpers ---

  // Creates or updates a TransactionLog for the given session.
  // The `update` function receives the current record (or a default) and returns the new one.
  func upsertTransactionLog(sessionId : Text, update : TransactionLog -> TransactionLog) {
    let now = Time.now();
    let existing = switch (transactionLogs.get(sessionId)) {
      case (?tl) { tl };
      case null {
        {
          id = sessionId;
          recipientEmail = "";
          customerName = "";
          transactionId = "";
          features = [];
          amountPaid = "0.00";
          licenseStatus = "pending";
          createdAt = now;
          updatedAt = now;
          pipelineSteps = [];
        }
      };
    };
    let updated = update(existing);
    transactionLogs.add(sessionId, { updated with updatedAt = now });
  };

  // Appends a PipelineStep to the TransactionLog for the given session.
  func addPipelineStep(sessionId : Text, step : Text, message : Text) {
    let now = Time.now();
    let newStep : PipelineStep = { step; message; timestamp = now };
    upsertTransactionLog(sessionId, func(tl) {
      { tl with pipelineSteps = tl.pipelineSteps.concat([newStep]) }
    });
  };

  func transactionLogIsTerminal(tl : TransactionLog) : Bool {
    tl.licenseStatus == "sent" or tl.licenseStatus == "failed";
  };

  // Removes abandoned checkout attempts for the same buyer when a newer session succeeds
  // or when the customer starts a fresh checkout (one visible log per purchase attempt).
  func pruneSupersededCheckoutLogs(keepSessionId : Text, caller : ?Principal, recipientEmail : Text) {
    let toRemove = List.empty<Text>();
    for ((sessionId, tl) in transactionLogs.entries()) {
      if (sessionId == keepSessionId or transactionLogIsTerminal(tl)) {
        // keep
      } else {
        var remove = false;
        if (recipientEmail.size() > 0 and tl.recipientEmail == recipientEmail) {
          remove := true;
        };
        if (not remove) {
          switch (caller, sessionOwners.get(sessionId)) {
            case (?c, ?owner) { if (c == owner) remove := true };
            case _ {};
          };
        };
        if (remove) { toRemove.add(sessionId) };
      };
    };
    for (sessionId in toRemove.toArray().vals()) {
      transactionLogs.remove(sessionId);
      sessionPurchasedFeatures.remove(sessionId);
    };
  };

  func isSupersededTransactionLogForDisplay(tl : TransactionLog, all : [TransactionLog]) : Bool {
    if (transactionLogIsTerminal(tl)) { return false };
    for (other in all.vals()) {
      if (other.id != tl.id and other.licenseStatus == "sent" and other.createdAt >= tl.createdAt) {
        if (tl.recipientEmail.size() > 0 and other.recipientEmail == tl.recipientEmail) {
          return true;
        };
        switch (sessionOwners.get(tl.id), sessionOwners.get(other.id)) {
          case (?a, ?b) { if (a == b) return true };
          case _ {};
        };
      };
    };
    false;
  };

  func filterTransactionLogsForDisplay(logs : [TransactionLog]) : [TransactionLog] {
    let visible = List.empty<TransactionLog>();
    for (tl in logs.vals()) {
      if (not isSupersededTransactionLogForDisplay(tl, logs)) {
        visible.add(tl);
      };
    };
    visible.toArray();
  };

  // --- Public TransactionLog endpoints ---

  // No auth required — admin payment console only (P0.3: was public; exposed customer PII).
  public query ({ caller }) func getTransactionLogs() : async [TransactionLog] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view transaction logs");
    };
    let logs = transactionLogs.values().toArray();
    filterTransactionLogsForDisplay(
      logs.sort(func(a : TransactionLog, b : TransactionLog) : { #less; #equal; #greater } {
        Int.compare(b.createdAt, a.createdAt)
      })
    );
  };

  public shared ({ caller }) func deleteTransactionLog(id : Text) : async Bool {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete transaction logs");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    switch (transactionLogs.get(id)) {
      case null { false };
      case (?_) {
        transactionLogs.remove(id);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteTransactionLogs(ids : [Text]) : async Nat {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete transaction logs");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    var count = 0;
    for (id in ids.vals()) {
      switch (transactionLogs.get(id)) {
        case null {};
        case (?_) {
          transactionLogs.remove(id);
          count += 1;
        };
      };
    };
    count;
  };

  // Email logs - internal logging for automated system
  func logEmailInternal(email : Text, subject : Text, deliveryStatus : Text, errorMessage : ?Text) : async () {
    let log : EmailLog = {
      email;
      subject;
      sentTimestamp = Time.now();
      deliveryStatus;
      errorMessage;
    };
    let logKey = email # Text.fromChar('-') # Time.now().toText();
    emailLogs.add(logKey, log);
  };

  public shared ({ caller }) func logEmail(email : Text, subject : Text, deliveryStatus : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can manually log emails");
    };
    await logEmailInternal(email, subject, deliveryStatus, null);
  };

  public query ({ caller }) func getEmailLogs() : async [EmailLog] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view email logs");
    };
    emailLogs.values().toArray();
  };

  // Delete email log (admin-only)
  public shared ({ caller }) func deleteEmailLog(logKey : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete email logs");
    };
    emailLogs.remove(logKey);
  };

  public shared ({ caller }) func deleteEmailLogs(logKeys : [Text]) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete email logs");
    };
    for (logKey in logKeys.vals()) {
      emailLogs.remove(logKey);
    };
  };

  // Product management
  public shared ({ caller }) func addProduct(product : Product) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    products.add(product.id, product);
  };

  public shared ({ caller }) func updateProduct(product : Product) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    products.add(product.id, product);
  };

  public shared ({ caller }) func deleteProduct(productId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete products");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    products.remove(productId);
  };

  // Public query - products must be viewable on landing page by everyone including guests
  public query func getProducts() : async [Product] {
    products.values().toArray();
  };

  // Stripe integration
  public query ({ caller }) func isStripeConfigured() : async Bool {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can check Stripe configuration status");
    };
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    stripeConfig := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case null Runtime.trap("Stripe needs to be first configured");
      case (?value) value;
    };
  };

  public shared func getStripeSessionStatus(sessionId : Text) : async Result.Result<{ sessionId : Text; customerEmail : Text; customerName : Text; bamm_transaction_id : Text; status : Text; features : [Text]; amountTotal : Nat }, Text> {
    let stripeKey = getStripeConfiguration().secretKey;
    if (stripeKey == "") { return #err("Stripe not configured") };

    let stripeUrl = "https://api.stripe.com/v1/checkout/sessions/" # sessionId # "?expand[]=line_items.data.price.product";
    let sessionResult = try {
      let body = await OutCall.httpGetRequest(
        stripeUrl,
        [{ name = "Authorization"; value = "Basic " # base64Encode(stripeKey # ":") }],
        transform
      );
      #ok(body)
    } catch (e) { #err(e.message()) };

    switch (sessionResult) {
      case (#err(e)) {
        addPipelineStep(sessionId, "error", "Error fetching session " # sessionId # ": " # e);
        return #err("Failed to fetch Stripe session: " # e);
      };
      case (#ok(responseBody)) {
        // Log raw response as a pipeline step (not a top-level EmailLog)
        addPipelineStep(sessionId, "debug", "Raw Stripe response (first 500): " # (if (responseBody.size() > 500) { Text.fromIter(responseBody.chars().take(500)) } else { responseBody }));

        let paymentStatus = switch (extractJsonStringField(responseBody, "payment_status")) {
          case null { "unknown" };
          case (?s) { s };
        };

        let sessionStatus = switch (extractJsonStringField(responseBody, "status")) {
          case null { "unknown" };
          case (?s) { s };
        };

        // Accept payment if payment_status=="paid" OR status=="complete"
        let isPaymentConfirmed = paymentStatus == "paid" or sessionStatus == "complete";

        if (not isPaymentConfirmed) {
          // Race condition: Stripe may not have finalized yet. Return pending so frontend retries.
          addPipelineStep(sessionId, "payment_pending", "Payment pending: payment_status=" # paymentStatus # ", status=" # sessionStatus # " (frontend will retry)");
          return #ok({ sessionId = sessionId; customerEmail = ""; customerName = ""; bamm_transaction_id = ""; status = "pending"; features = []; amountTotal = 0 });
        };

        // Extract customer email: try customer_details.email FIRST (populated for hosted checkout
        // where top-level customer_email is null for guest checkouts), then fall back to top-level
        // customer_email (populated when customer is logged in to Stripe), then fallback.
        let customerEmail = switch (extractNestedJsonStringField(responseBody, "customer_details", "email")) {
          case (?e) { if (e == "" or e == "null" or not e.contains(#char '@')) {
            switch (extractJsonStringField(responseBody, "customer_email")) {
              case (?ce) { if (ce == "" or ce == "null" or not ce.contains(#char '@')) "unknown@customer.com" else ce };
              case null { "unknown@customer.com" };
            }
          } else e };
          case null {
            switch (extractJsonStringField(responseBody, "customer_email")) {
              case (?ce) { if (ce == "" or ce == "null" or not ce.contains(#char '@')) "unknown@customer.com" else ce };
              case null { "unknown@customer.com" };
            }
          };
        };

        // Extract customer name: try customer_details.name then billing_details.name
        let customerName = switch (extractNestedJsonStringField(responseBody, "customer_details", "name")) {
          case (?n) { if (n == "" or n == "null") {
            switch (extractNestedJsonStringField(responseBody, "billing_details", "name")) {
              case (?bn) { if (bn == "" or bn == "null") "BAMM Customer" else bn };
              case null { "BAMM Customer" };
            }
          } else n };
          case null {
            switch (extractNestedJsonStringField(responseBody, "billing_details", "name")) {
              case (?bn) { if (bn == "" or bn == "null") "BAMM Customer" else bn };
              case null { "BAMM Customer" };
            }
          };
        };

        // Extract payment_intent for BAMM transaction ID (last 4 chars)
        let paymentIntent = switch (extractJsonStringField(responseBody, "payment_intent")) {
          case null { sessionId };
          case (?pi) { if (pi == "null" or pi == "") sessionId else pi };
        };
        let bammTxId = last4Chars(paymentIntent);

        // Return amountTotal in CENTS (raw Stripe value, e.g. 50 = $0.50)
        // Frontend divides by 100 to get dollars before displaying/storing
        let amountTotal : Nat = switch (extractJsonNatFieldSpaced(responseBody, "amount_total")) {
          case null { 0 };
          case (?a) { a };
        };

        // Validate customer email before proceeding — return error if unknown
        if (customerEmail == "unknown@customer.com" or not customerEmail.contains(#char '@')) {
          addPipelineStep(sessionId, "email_extraction_failed", "Could not extract valid customer email from Stripe session " # sessionId);
          return #err("Could not extract valid customer email from Stripe session. Please contact support with transaction reference: " # sessionId);
        };

        // Map Stripe line items to exact BAMM feature names — no fallback to all features
        let (finalFeatures, featureSource) = await resolvePurchasedFeatures(sessionId, responseBody, stripeKey);
        if (finalFeatures.size() == 0) {
          addPipelineStep(sessionId, "features_error", "Could not extract purchased features from Stripe session " # sessionId);
          return #err("Could not extract purchased features from Stripe session. No license will be generated. Please contact support.");
        };
        if (featureSource != "stripe_session_line_items") {
          addPipelineStep(sessionId, "features_warning", "Line_items parse used " # featureSource # " (" # finalFeatures.size().toText() # " feature(s)).");
        };

        // Build dollar-formatted amount string (cents -> dollars)
        let amountDollars : Text = if (amountTotal == 0) { "0.00" } else {
          let dollars = amountTotal / 100;
          let cents = amountTotal % 100;
          dollars.toText() # "." # (if (cents < 10) { "0" # cents.toText() } else { cents.toText() })
        };

        // Update TransactionLog with confirmed payment details
        upsertTransactionLog(sessionId, func(tl) {
          {
            tl with
            recipientEmail = customerEmail;
            customerName = customerName;
            transactionId = bammTxId;
            features = finalFeatures;
            amountPaid = amountDollars;
            licenseStatus = "pending";
          }
        });
        addPipelineStep(sessionId, "payment_confirmed", "Payment confirmed for " # customerEmail # ", payment_status=" # paymentStatus # ", status=" # sessionStatus);
        switch (sessionOwners.get(sessionId)) {
          case (?caller) { pruneSupersededCheckoutLogs(sessionId, ?caller, customerEmail) };
          case null { pruneSupersededCheckoutLogs(sessionId, null, customerEmail) };
        };

        #ok({ sessionId = sessionId; customerEmail = customerEmail; customerName = customerName; bamm_transaction_id = bammTxId; status = "paid"; features = finalFeatures; amountTotal = amountTotal });
      };
    };
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    let fullSuccessUrl = successUrl # "?session_id={CHECKOUT_SESSION_ID}";
    let sessionJson = await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, fullSuccessUrl, cancelUrl, transform);

    // Extract the actual session ID and checkout URL from the full Stripe session JSON response
    let realSessionId = switch (extractJsonStringField(sessionJson, "id")) {
      case (?sid) { sid };
      case null { "" };
    };

    let checkoutUrl = switch (extractJsonStringField(sessionJson, "url")) {
      case (?u) { u };
      case null { "" };
    };

    if (realSessionId != "") {
      // Track session ownership by real session ID
      sessionOwners.add(realSessionId, caller);
      let checkoutFeatures = collectFeaturesFromShoppingItems(items);
      if (checkoutFeatures.size() > 0) {
        sessionPurchasedFeatures.add(realSessionId, checkoutFeatures);
      };
      addPipelineStep(realSessionId, "checkout_created", "Stripe checkout session created: " # realSessionId);
      pruneSupersededCheckoutLogs(realSessionId, ?caller, "");
    } else {
      await logEmailInternal("stripe_checkout", "Stripe checkout session created but could not extract session ID", "warning", null);
    };

    if (checkoutUrl == "") {
      "error: could not extract checkout URL from Stripe session response";
    } else {
      checkoutUrl;
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Email automation settings management
  public shared ({ caller }) func updateEmailAutomationSettings(settings : EmailAutomationSettings) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update email automation settings");
    };
    emailAutomationSettings := settings;
  };

  public query ({ caller }) func getEmailAutomationSettings() : async EmailAutomationSettings {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view email automation settings");
    };
    emailAutomationSettings;
  };

  // 30-day trial license file management
  public shared ({ caller }) func uploadTrialLicenseFile(file : Blob) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can upload trial license files");
    };
    trialLicenseFile := ?file;
  };

  public query ({ caller }) func getTrialLicenseFile() : async ?Blob {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can access trial license files");
    };
    trialLicenseFile;
  };

  // License features management
  public shared ({ caller }) func addLicenseFeature(feature : LicenseFeature) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can add license features");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    licenseFeatures.add(feature.id, feature);
  };

  public shared ({ caller }) func updateLicenseFeature(feature : LicenseFeature) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update license features");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    licenseFeatures.add(feature.id, feature);
  };

  public shared ({ caller }) func deleteLicenseFeature(featureId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete license features");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    licenseFeatures.remove(featureId);
  };

  // Public query - license features must be viewable on landing page for product information
  public query func getLicenseFeatures() : async [LicenseFeature] {
    licenseFeatures.values().toArray();
  };

  // License records management
  func recordLicenseInternal(licenseJson : Text, recipientEmail : Text, features : [Text], expirationDate : Int, deliveryStatus : Text) {
    let record : LicenseRecord = {
      licenseJson;
      recipientEmail;
      features;
      expirationDate;
      generatedTimestamp = Time.now();
      deliveryStatus;
    };
    let recordKey = recipientEmail # Text.fromChar('-') # Time.now().toText();
    licenseRecords.add(recordKey, record);
  };

  public shared ({ caller }) func recordLicense(licenseJson : Text, recipientEmail : Text, features : [Text], expirationDate : Int, deliveryStatus : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can manually record licenses");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #licenseGenerator) };
    recordLicenseInternal(licenseJson, recipientEmail, features, expirationDate, deliveryStatus);
  };

  public query ({ caller }) func getLicenseRecords() : async [LicenseRecord] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view license records");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    licenseRecords.values().toArray();
  };

  // Delete license record (admin-only)
  public shared ({ caller }) func deleteLicenseRecord(recordId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete license records");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #licenseGenerator) };
    licenseRecords.remove(recordId);
  };

  public shared ({ caller }) func deleteLicenseRecords(recordIds : [Text]) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete license records");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #licenseGenerator) };
    for (recordId in recordIds.vals()) {
      licenseRecords.remove(recordId);
    };
  };

  // RSA private key management — PEM is stored on-canister and used only for server-side signing.
  public shared ({ caller }) func uploadPrivateKeyPem(pem : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can upload private key files");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    let trimmed = pem.trim(#predicate(func (c : Char) : Bool { c == ' ' or c == '\t' or c == '\r' }));
    if (not (trimmed.contains(#text "BEGIN") and trimmed.contains(#text "PRIVATE KEY"))) {
      Runtime.trap("Invalid PEM format: expected RSA PRIVATE KEY block");
    };
    privateKeyPem := ?trimmed;
    privateKeyFile := null;
  };

  // Deprecated: legacy object-storage upload. Admins should use uploadPrivateKeyPem instead.
  public shared ({ caller }) func uploadPrivateKeyFile(file : Blob) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can upload private key files");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    privateKeyFile := ?file;
    Runtime.trap("uploadPrivateKeyFile is deprecated. Use uploadPrivateKeyPem with the PEM text instead.");
  };

  func escapeJsonString(value : Text) : Text {
    value
      .replace(#text "\\", "\\\\")
      .replace(#text "\"", "\\\"")
      .replace(#text "\n", "\\n")
      .replace(#text "\r", "\\r");
  };

  func buildLicensePayloadJson(
    features : [Text],
    issuedTo : Text,
    expiresDateOnly : Text,
    generatedAtIso : Text,
  ) : Text {
    let featuresJson = "[" # features.map(func(f) { "\"" # escapeJsonString(f) # "\"" }).values().join(",") # "]";
    "{\"features\":" # featuresJson #
      ",\"issued_to\":\"" # escapeJsonString(issuedTo) # "\"" #
      ",\"expires\":\"" # expiresDateOnly # "\"" #
      ",\"generated_by\":\"BAMM License Generation System\"" #
      ",\"generated_at\":\"" # generatedAtIso # "\"}";
  };

  func entitlementStatusToText(status : EntitlementStatus) : Text {
    switch (status) {
      case (#pending_activation) "pending_activation";
      case (#activated) "activated";
      case (#forfeited) "forfeited";
      case (#expired) "expired";
    };
  };

  func normalizeEmail(email : Text) : Text {
    email.trim(#predicate(func (c : Char) : Bool { c == ' ' or c == '\t' or c == '\r' or c == '\n' }));
  };

  func unionFeatureNames(existing : [Text], incoming : [Text]) : [Text] {
    var acc = existing;
    for (feature in incoming.vals()) {
      var found = false;
      for (current in acc.vals()) {
        if (current == feature) { found := true };
      };
      if (not found) {
        acc := acc.concat([feature]);
      };
    };
    acc;
  };

  func newEntitlementId(nowNs : Int) : Text {
    "ent_" # Int.abs(nowNs).toText();
  };

  func newActivationNonce(email : Text, nowNs : Int) : Text {
    base64Encode(email # ":" # Int.abs(nowNs).toText());
  };

  func buildLicensePayloadJsonV2(
    features : [Text],
    issuedTo : Text,
    entitlementId : Text,
    generatedAtIso : Text,
    activationDeadlineIso : ?Text,
    activatedAtIso : ?Text,
    expiresIso : ?Text,
    machineDigest : ?Text,
    activationNonce : ?Text,
  ) : Text {
    let featuresJson = "[" # features.map(func(f) { "\"" # escapeJsonString(f) # "\"" }).values().join(",") # "]";
    var payload =
      "{\"schema_version\":2"
      # ",\"entitlement_id\":\"" # escapeJsonString(entitlementId) # "\""
      # ",\"features\":" # featuresJson
      # ",\"issued_to\":\"" # escapeJsonString(issuedTo) # "\""
      # ",\"generated_by\":\"BAMM License Generation System\""
      # ",\"generated_at\":\"" # generatedAtIso # "\"";

    switch (activationDeadlineIso) {
      case null {};
      case (?deadline) {
        payload #= ",\"activation_deadline\":\"" # deadline # "\"";
      };
    };
    switch (activatedAtIso) {
      case null {};
      case (?activatedAt) {
        payload #= ",\"activated_at\":\"" # activatedAt # "\"";
      };
    };
    switch (expiresIso) {
      case null {};
      case (?expires) {
        payload #= ",\"expires\":\"" # expires # "\"";
      };
    };
    switch (machineDigest) {
      case null {};
      case (?digest) {
        payload #=
          ",\"machine_binding\":{\"digest\":\"" # escapeJsonString(digest) #
          "\",\"algorithm\":\"bamm-v1\"}";
      };
    };
    switch (activationNonce) {
      case null {};
      case (?nonce) {
        payload #= ",\"activation_nonce\":\"" # escapeJsonString(nonce) # "\"";
      };
    };
    payload # "}";
  };

  func entitlementToStatusView(entitlement : CustomerEntitlement) : EntitlementStatusView {
    {
      entitlementId = entitlement.entitlementId;
      email = entitlement.email;
      features = entitlement.features;
      status = entitlementStatusToText(entitlement.status);
      activationDeadlineIso = nowNsToIso(entitlement.activationDeadlineNs);
      activatedAtIso = switch (entitlement.activatedAtNs) {
        case null null;
        case (?ns) ?nowNsToIso(ns);
      };
      expiresIso = switch (entitlement.expiresAtNs) {
        case null null;
        case (?ns) ?nowNsToIso(ns);
      };
      machineBindingDigest = entitlement.machineBindingDigest;
      activationNonce = entitlement.activationNonce;
    };
  };

  func refreshEntitlementLifecycle(entitlement : CustomerEntitlement, nowNs : Int) : CustomerEntitlement {
    switch (entitlement.status) {
      case (#pending_activation) {
        if (nowNs > entitlement.activationDeadlineNs) {
          { entitlement with status = #forfeited; updatedAtNs = nowNs };
        } else { entitlement };
      };
      case (#activated) {
        switch (entitlement.expiresAtNs) {
          case null entitlement;
          case (?expiresAt) {
            if (nowNs > expiresAt) {
              { entitlement with status = #expired; updatedAtNs = nowNs };
            } else { entitlement };
          };
        };
      };
      case (_) entitlement;
    };
  };

  func persistEntitlement(entitlement : CustomerEntitlement) {
    let emailKey = normalizeEmail(entitlement.email);
    entitlementsByEmail.add(emailKey, entitlement);
    emailByEntitlementId.add(entitlement.entitlementId, emailKey);
  };

  func getEntitlementById(entitlementId : Text) : ?CustomerEntitlement {
    switch (emailByEntitlementId.get(entitlementId)) {
      case null null;
      case (?emailKey) {
        switch (entitlementsByEmail.get(emailKey)) {
          case null null;
          case (?entitlement) ?refreshEntitlementLifecycle(entitlement, Time.now());
        };
      };
    };
  };

  func signEntitlementLicense(payloadJson : Text) : ?Text {
    signPayloadJsonInternal(payloadJson);
  };

  func buildSignedEntitlementLicense(
    entitlement : CustomerEntitlement,
    nowNs : Int,
  ) : ?Text {
    let generatedAtIso = nowNsToIso(nowNs);
    let payloadJson = switch (entitlement.status) {
      case (#activated) {
        switch (entitlement.activatedAtNs, entitlement.expiresAtNs, entitlement.machineBindingDigest) {
          case (?activatedAtNs, ?expiresAtNs, ?digest) {
            buildLicensePayloadJsonV2(
              entitlement.features,
              entitlement.email,
              entitlement.entitlementId,
              generatedAtIso,
              null,
              ?nowNsToIso(activatedAtNs),
              ?nowNsToIso(expiresAtNs),
              ?digest,
              null,
            );
          };
          case _ {
            buildLicensePayloadJsonV2(
              entitlement.features,
              entitlement.email,
              entitlement.entitlementId,
              generatedAtIso,
              ?nowNsToIso(entitlement.activationDeadlineNs),
              null,
              null,
              null,
              ?entitlement.activationNonce,
            );
          };
        };
      };
      case _ {
        buildLicensePayloadJsonV2(
          entitlement.features,
          entitlement.email,
          entitlement.entitlementId,
          generatedAtIso,
          ?nowNsToIso(entitlement.activationDeadlineNs),
          null,
          null,
          null,
          ?entitlement.activationNonce,
        );
      };
    };
    signEntitlementLicense(payloadJson);
  };

  func upsertEntitlementFromPurchase(
    email : Text,
    features : [Text],
    nowNs : Int,
    stripeSessionId : ?Text,
  ) : CustomerEntitlement {
    let emailKey = normalizeEmail(email);
    let prior = entitlementsByEmail.get(emailKey);
    let windowNs = activationWindowDays * nsPerDay;
    let newDeadline = nowNs + windowNs;

    let entitlement : CustomerEntitlement = switch (entitlementsByEmail.get(emailKey)) {
      case null {
        {
          entitlementId = newEntitlementId(nowNs);
          email = emailKey;
          features = features;
          purchasedAtNs = nowNs;
          activationDeadlineNs = newDeadline;
          activatedAtNs = null;
          expiresAtNs = null;
          machineBindingDigest = null;
          activationNonce = newActivationNonce(emailKey, nowNs);
          status = #pending_activation;
          updatedAtNs = nowNs;
        };
      };
      case (?existing) {
        let refreshed = refreshEntitlementLifecycle(existing, nowNs);
        let mergedFeatures = unionFeatureNames(refreshed.features, features);
        let mergedDeadline = Int.max(refreshed.activationDeadlineNs, newDeadline);
        switch (refreshed.status) {
          case (#activated) {
            {
              refreshed with
              features = mergedFeatures;
              purchasedAtNs = nowNs;
              activationDeadlineNs = mergedDeadline;
              updatedAtNs = nowNs;
            };
          };
          case (#forfeited) {
            {
              entitlementId = refreshed.entitlementId;
              email = emailKey;
              features = mergedFeatures;
              purchasedAtNs = nowNs;
              activationDeadlineNs = newDeadline;
              activatedAtNs = null;
              expiresAtNs = null;
              machineBindingDigest = null;
              activationNonce = newActivationNonce(emailKey, nowNs);
              status = #pending_activation;
              updatedAtNs = nowNs;
            };
          };
          case (_) {
            {
              refreshed with
              features = mergedFeatures;
              purchasedAtNs = nowNs;
              activationDeadlineNs = mergedDeadline;
              status = #pending_activation;
              activatedAtNs = null;
              expiresAtNs = null;
              machineBindingDigest = null;
              activationNonce = newActivationNonce(emailKey, nowNs);
              updatedAtNs = nowNs;
            };
          };
        };
      };
    };

    persistEntitlement(entitlement);
    let workflowStep = switch (prior) {
      case null { "entitlement_created" };
      case (?prev) {
        switch (refreshEntitlementLifecycle(prev, nowNs).status) {
          case (#activated) { "entitlement_features_merged" };
          case (#forfeited) { "entitlement_reopened" };
          case (_) { "entitlement_merged" };
        };
      };
    };
    appendEntitlementWorkflowLog(
      entitlement.entitlementId,
      workflowStep,
      "Features: [" # entitlement.features.map(func(f) { f }).values().join(", ") # "]; status="
      # entitlementStatusToText(entitlement.status),
      stripeSessionId,
    );
    entitlement;
  };

  func buildSignedLicenseJson(payloadJson : Text, signatureB64 : Text) : Text {
    "{\"payload\":" # payloadJson # ",\"signature\":\"" # signatureB64 # "\"}";
  };

  func signPayloadJsonInternal(payloadJson : Text) : ?Text {
    switch (privateKeyPem) {
      case null null;
      case (?pem) {
        switch (LicenseSigner.signPayloadJson(pem, payloadJson)) {
          case (#ok(signature)) { ?buildSignedLicenseJson(payloadJson, signature) };
          case (#err(_)) null;
        };
      };
    };
  };

  func privateKeyConfigured() : Bool {
    switch (privateKeyPem) {
      case (?pem) { pem.size() > 0 };
      case null { false };
    };
  };

  // License generation endpoint (admin-only). Issues networked v2 grace licenses
  // (schema_version 2 + entitlement registry) — same contract as Stripe fulfillment.
  public shared ({ caller }) func generateLicense(request : LicenseRequest) : async Text {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can generate licenses");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #licenseGenerator) };
    if (not privateKeyConfigured()) {
      Runtime.trap("RSA private key is not configured. Upload private.pem via uploadPrivateKeyPem.");
    };
    if (request.features.size() == 0) {
      Runtime.trap("Select at least one feature.");
    };

    let nowNs = Time.now();
    let entitlement = upsertEntitlementFromPurchase(
      request.recipientEmail,
      request.features,
      nowNs,
      null,
    );
    appendEntitlementWorkflowLog(
      entitlement.entitlementId,
      "admin_license_generated",
      "Admin generateLicense issued v2 grace license",
      null,
    );
    let licensePayloadJson = switch (buildSignedEntitlementLicense(entitlement, nowNs)) {
      case null Runtime.trap("License signing failed. Check the uploaded RSA private key.");
      case (?signed) signed;
    };

    recordLicenseInternal(
      licensePayloadJson,
      request.recipientEmail,
      entitlement.features,
      entitlement.activationDeadlineNs,
      "generated_v2",
    );

    if (request.deliveryMethod == "email" or request.deliveryMethod == "both") {
      let subject = "Your BAMM premium license — activate within 30 days";
      let body =
        "Your signed license file is attached. Open BAMM, tap the Premium chip in the top bar, and finish setup in Manage → Server Settings.\n"
        # "You have 30 days of Premium while you connect — your full year starts when you activate on this computer.\n\n"
        # "Your financial records stay on your device. Trades and Tx Simulator are planning tools only—not investment or tax advice.\n\n"
        # "Questions? support@bammservice.com\n— BAMM SERVICES INC.";
      let emailResult = await sendLicenseEmailWithResend(
        request.recipientEmail,
        licensePayloadJson,
        subject,
        body,
      );
      switch (emailResult) {
        case (#ok(_)) {
          appendEntitlementWorkflowLog(
            entitlement.entitlementId,
            "license_emailed",
            "Admin generateLicense emailed v2 grace license",
            null,
          );
        };
        case (#err(error)) {
          await logEmailInternal(request.recipientEmail, subject, "failed", ?error);
        };
      };
    };

    licensePayloadJson;
  };

  // Helper kept for compatibility — signing is performed in signPayloadJsonInternal.
  func signLicense(payload : {
    features : [Text];
    recipientEmail : Text;
    expirationDate : Int;
    generatedTimestamp : Int;
  }, _keyFile : Blob) : async Text {
    let expiresIso = msToIso(payload.expirationDate);
    let generatedAtIso = nowNsToIso(payload.generatedTimestamp);
    let payloadJson = buildLicensePayloadJson(payload.features, payload.recipientEmail, expiresIso, generatedAtIso);
    switch (signPayloadJsonInternal(payloadJson)) {
      case null {
        "{\"payload\":" # payloadJson # ",\"signature\":\"signing_failed\"}";
      };
      case (?signed) signed;
    };
  };

  // RESEND email sending with proper error handling
  // sendLicenseEmailWithResend: makes a real HTTP outcall to the RESEND API.
  // RESEND email sending with license as a proper JSON attachment
  // RESEND email sending with proper error handling
  // sendLicenseEmailWithResend: makes a real HTTP outcall to the RESEND API.
  // RESEND email sending with license as a proper JSON attachment
  // Sends a plain HTML email via RESEND with NO attachment.
  // Used for admin invite emails so no corrupted body or JSON blob is appended.
  func sendPlainEmailWithResend(recipientEmail : Text, subject : Text, body : Text) : async EmailSendResult {
    switch (resendConfig) {
      case null {
        return #err("RESEND configuration not set. Please configure RESEND settings in admin panel.");
      };
      case (?config) {
        let trimmedApiKey = config.apiKey.trim(#predicate(func c = c == ' '));
        if (trimmedApiKey == "") {
          let errMsg = "RESEND API key is not configured. Please set your RESEND API key in the admin panel Config tab.";
          await logEmailInternal(recipientEmail, subject, "failed", ?errMsg);
          return #err(errMsg);
        };

        let url = config.baseUrl # "/emails";
        let trimmedServiceName = config.serviceName.trim(#predicate(func c = c == ' '));
        let rawSenderEmail = config.senderEmail.trim(#predicate(func c = c == ' '));
        let trimmedSenderEmail = if (rawSenderEmail == "") { defaultSenderEmail } else { rawSenderEmail };
        let fromField = trimmedServiceName # " <" # trimmedSenderEmail # ">";

        let htmlBody = "<p>" # body.replace(#text "\n", "</p><p>") # "</p><p>— BAMM SERVICES INC.</p>";
        let escapedHtml = htmlBody
          .replace(#text "\\", "\\\\")
          .replace(#text "\"", "\\\"")
          .replace(#text "\n", "\\n")
          .replace(#text "\r", "\\r");

        // Escape fromField (contains angle brackets) and subject before JSON embedding
        let escapedFrom = fromField
          .replace(#text "\\", "\\\\")
          .replace(#text "\"", "\\\"")
          .replace(#text "\n", "\\n")
          .replace(#text "\r", "\\r");
        let escapedSubject = subject
          .replace(#text "\\", "\\\\")
          .replace(#text "\"", "\\\"")
          .replace(#text "\n", "\\n")
          .replace(#text "\r", "\\r");

        let requestBodyJson =
          "{" #
          "\"from\":\"" # escapedFrom # "\"," #
          "\"to\":[\"" # recipientEmail # "\"]," #
          "\"subject\":\"" # escapedSubject # "\"," #
          "\"html\":\"" # escapedHtml # "\"" #
          "}";

        let requestHeaders : [OutCall.Header] = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # trimmedApiKey },
        ];

        try {
          let responseText = await OutCall.httpPostRequest(url, requestHeaders, requestBodyJson, transform);
          await logEmailInternal(recipientEmail, subject, "sent", null);
          #ok("Email sent successfully to " # recipientEmail # ". Response: " # responseText);
        } catch (e) {
          let errMsg = "HTTP outcall failed: " # e.message();
          await logEmailInternal(recipientEmail, subject, "failed", ?errMsg);
          #err(errMsg);
        };
      };
    };
  };

  func sendLicenseEmailWithResend(recipientEmail : Text, licenseJson : Text, subject : Text, body : Text) : async EmailSendResult {
    await sendLicenseEmailWithResendFilename(recipientEmail, licenseJson, subject, body, "BAMM-License.json");
  };

  func sendLicenseEmailWithResendFilename(recipientEmail : Text, licenseJson : Text, subject : Text, body : Text, filename : Text) : async EmailSendResult {
    switch (resendConfig) {
      case null {
        return #err("RESEND configuration not set. Please configure RESEND settings in admin panel.");
      };
      case (?config) {
        // Guard: refuse to send if API key is empty or blank
        let trimmedApiKey = config.apiKey.trim(#predicate(func c = c == ' '));
        if (trimmedApiKey == "") {
          let errMsg = "RESEND API key is not configured. Please set your RESEND API key in the admin panel Config tab.";
          await logEmailInternal(recipientEmail, subject, "failed", ?errMsg);
          return #err(errMsg);
        };

        let url = config.baseUrl # "/emails";
        let trimmedServiceName = config.serviceName.trim(#predicate(func c = c == ' '));
        let rawSenderEmail = config.senderEmail.trim(#predicate(func c = c == ' '));
        let trimmedSenderEmail = if (rawSenderEmail == "") { defaultSenderEmail } else { rawSenderEmail };
        let fromField = trimmedServiceName # " <" # trimmedSenderEmail # ">";

        // Base64-encode the license JSON for the attachment
        let licenseBase64 = base64Encode(licenseJson);

        // Clean email body — no JSON embedded in HTML
        let htmlBody = "<p>" # body.replace(#text "\n", "</p><p>") # "</p><p>Your license file is attached as <strong>" # filename # "</strong>. Import it in BAMM to activate your features.</p><p>Your financial records stay on your device.</p><p>— BAMM SERVICES INC.</p>";

        // Escape HTML body for JSON string value
        let escapedHtml = htmlBody
          .replace(#text "\\", "\\\\")
          .replace(#text "\"", "\\\"")
          .replace(#text "\n", "\\n")
          .replace(#text "\r", "\\r");

        let requestBodyJson =
          "{" #
          "\"from\":\"" # fromField # "\"," #
          "\"to\":[\"" # recipientEmail # "\"]," #
          "\"subject\":\"" # subject # "\"," #
          "\"html\":\"" # escapedHtml # "\"," #
          "\"attachments\":[{\"filename\":\"" # filename # "\",\"content\":\"" # licenseBase64 # "\",\"content_type\":\"application/json\"}]" #
          "}";

        let requestHeaders : [OutCall.Header] = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # trimmedApiKey },
        ];

        try {
          let responseText = await OutCall.httpPostRequest(url, requestHeaders, requestBodyJson, transform);
          await logEmailInternal(recipientEmail, subject, "sent", null);
          #ok("Email sent successfully to " # recipientEmail # ". Response: " # responseText);
        } catch (e) {
          let errMsg = "HTTP outcall failed: " # e.message();
          await logEmailInternal(recipientEmail, subject, "failed", ?errMsg);
          #err(errMsg);
        };
      };
    };
  };

  // Helper function to send license email (legacy wrapper)
  func sendLicenseEmail(recipientEmail : Text, licenseJson : Text) : async () {
    let result = await sendLicenseEmailWithResend(recipientEmail, licenseJson, emailAutomationSettings.emailSubject, emailAutomationSettings.emailBody);
    switch (result) {
      case (#ok(_)) {
        Debug.print("License email sent successfully");
      };
      case (#err(error)) {
        Debug.print("Failed to send license email: " # error);
      };
    };
  };

  // Feature management functions
  public shared ({ caller }) func enableFeature(featureId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can enable features");
    };
    switch (licenseFeatures.get(featureId)) {
      case null { Runtime.trap("Feature not found") };
      case (?feature) {
        licenseFeatures.add(featureId, { feature with isActive = true });
      };
    };
  };

  public shared ({ caller }) func disableFeature(featureId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can disable features");
    };
    switch (licenseFeatures.get(featureId)) {
      case null { Runtime.trap("Feature not found") };
      case (?feature) {
        licenseFeatures.add(featureId, { feature with isActive = false });
      };
    };
  };

  public shared ({ caller }) func updateFeatureStatus(featureId : Text, isActive : Bool) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update feature status");
    };
    switch (licenseFeatures.get(featureId)) {
      case null { Runtime.trap("Feature not found") };
      case (?feature) {
        licenseFeatures.add(featureId, { feature with isActive });
      };
    };
  };

  // Public query - active features must be viewable on landing page for product information
  public query func getActiveFeatures() : async [LicenseFeature] {
    let allFeatures = licenseFeatures.values().toArray();
    allFeatures.filter(func(feature : LicenseFeature) : Bool { feature.isActive });
  };

  // Public query - premium features must be viewable on landing page for product information
  public query func getPremiumFeatures() : async [LicenseFeature] {
    let allFeatures = licenseFeatures.values().toArray();
    allFeatures.filter(func(feature : LicenseFeature) : Bool { feature.isPremium and feature.isActive });
  };

  // Public query - core features must be viewable on landing page for product information
  public query func getCoreFeatures() : async [LicenseFeature] {
    let allFeatures = licenseFeatures.values().toArray();
    allFeatures.filter(func(feature : LicenseFeature) : Bool { not feature.isPremium and feature.isActive });
  };

  // Initialize default premium features
  public shared ({ caller }) func initializeDefaultPremiumFeatures() : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can initialize default premium features");
    };

    let defaultFeatures : [LicenseFeature] = [
      {
        id = "paycheck_budget";
        name = "Paycheck Budget";
        description = "Advanced paycheck budgeting tools for financial planning.";
        isPremium = true;
        isActive = true;
        priceInCents = 1999;
        image = null;
        featureType = "Premium";
        licenseReferenceName = "Paycheck Budget";
      },
      {
        id = "goals";
        name = "Goals";
        description = "Set and track financial goals with progress monitoring.";
        isPremium = true;
        isActive = true;
        priceInCents = 1499;
        image = null;
        featureType = "Premium";
        licenseReferenceName = "Goals";
      },
      {
        id = "tx_simulator";
        name = "Tx Simulator";
        description = "Estimate tax scenarios for planning—not filing advice. Consult a qualified professional before acting.";
        isPremium = true;
        isActive = true;
        priceInCents = 1299;
        image = null;
        featureType = "Premium";
        licenseReferenceName = "Tx Simulator";
      },
      {
        id = "migration-management";
        name = "Database Management";
        description = "Advanced database management and migration tools for power users.";
        isPremium = true;
        isActive = true;
        priceInCents = 2499;
        image = null;
        featureType = "Premium";
        licenseReferenceName = "Database Management";
      },
      {
        id = "trades";
        name = "Trades";
        description = "Scan, backtest, and trade with risk controls you define. Strategy tools only—not investment advice.";
        isPremium = true;
        isActive = true;
        priceInCents = 4999;
        image = null;
        featureType = "Premium";
        licenseReferenceName = "Trades";
      },
    ];

    for (feature in defaultFeatures.values()) {
      licenseFeatures.add(feature.id, feature);
    };
  };

  // Initialize default free/core features for homepage Learn More marketing images.
  // Idempotent: only inserts missing ids; does not overwrite existing images.
  public shared ({ caller }) func initializeDefaultCoreFeatures() : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can initialize default core features");
    };

    let defaultCore : [LicenseFeature] = [
      {
        id = "dashboard";
        name = "Dashboard";
        description = "Your financial command center. See income, expenses, and balances in one view.";
        isPremium = false;
        isActive = true;
        priceInCents = 0;
        image = null;
        featureType = "Core";
        licenseReferenceName = "";
      },
      {
        id = "bill_files";
        name = "Bill Files";
        description = "Organize, track, and manage bills with due dates and payment status.";
        isPremium = false;
        isActive = true;
        priceInCents = 0;
        image = null;
        featureType = "Core";
        licenseReferenceName = "";
      },
      {
        id = "income_tracking";
        name = "Income and Bill Tracking";
        description = "Track income sources and spending so you always know what is left after bills.";
        isPremium = false;
        isActive = true;
        priceInCents = 0;
        image = null;
        featureType = "Core";
        licenseReferenceName = "";
      },
    ];

    for (feature in defaultCore.values()) {
      switch (licenseFeatures.get(feature.id)) {
        case (?_) {};
        case null { licenseFeatures.add(feature.id, feature) };
      };
    };
  };

  private func computeBundlePricing(featureIds : [Text], priceInCentsAnnual : Nat) : (Nat, Nat) {
    var sum : Nat = 0;
    for (fid in featureIds.vals()) {
      switch (licenseFeatures.get(fid)) {
        case (?feature) { sum += feature.priceInCents };
        case null {};
      };
    };
    let savings = if (sum > priceInCentsAnnual) { sum - priceInCentsAnnual } else { 0 };
    (sum, savings);
  };

  private func resolveBundleFeatureId(raw : Text) : Text {
    if (raw == "database_management") {
      return "migration-management";
    };
    switch (licenseFeatures.get(raw)) {
      case (?_) { return raw };
      case null {};
    };
    for ((_id, feature) in licenseFeatures.entries()) {
      if (feature.licenseReferenceName == raw or feature.name == raw) {
        return _id;
      };
    };
    raw;
  };

  private func normalizeBundleFeatureIds(ids : [Text]) : [Text] {
    let seen = Set.empty<Text>();
    let result = List.empty<Text>();
    for (raw in ids.vals()) {
      let fid = resolveBundleFeatureId(raw);
      switch (licenseFeatures.get(fid)) {
        case (?_) {
          if (not seen.contains(fid)) {
            seen.add(fid);
            result.add(fid);
          };
        };
        case null {};
      };
    };
    result.toArray();
  };

  private func bundleLicenseReferenceNames(featureIds : [Text]) : [Text] {
    let names = List.empty<Text>();
    for (fid in featureIds.vals()) {
      switch (licenseFeatures.get(fid)) {
        case (?feature) {
          let refName = if (feature.licenseReferenceName != "") {
            feature.licenseReferenceName
          } else {
            feature.name
          };
          names.add(refName);
        };
        case null {};
      };
    };
    names.toArray();
  };

  private func findBundleForLineItem(raw : Text) : ?LicenseBundle {
    let lowerRaw = raw.toLower();
    for ((_id, bundle) in licenseBundles.entries()) {
      if (bundle.isActive) {
        let bundleNameLower = bundle.name.toLower();
        let bundleIdLower = bundle.bundleId.toLower();
        if (
          lowerRaw == bundleNameLower
          or lowerRaw == bundleIdLower
          or lowerRaw.contains(#text bundleNameLower)
          or lowerRaw.contains(#text bundleIdLower)
        ) {
          return ?bundle;
        };
      };
    };
    null;
  };

  private func withBundlePricing(bundle : LicenseBundle) : LicenseBundle {
    let featureIds = normalizeBundleFeatureIds(bundle.featureIds);
    let (sum, savings) = computeBundlePricing(featureIds, bundle.priceInCentsAnnual);
    {
      bundle with
      featureIds = featureIds;
      alaCarteSumCents = sum;
      savingsCents = savings;
    };
  };

  public shared ({ caller }) func addLicenseBundle(bundle : LicenseBundle) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can add license bundles");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    licenseBundles.add(bundle.bundleId, withBundlePricing(bundle));
  };

  public shared ({ caller }) func updateLicenseBundle(bundle : LicenseBundle) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update license bundles");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    licenseBundles.add(bundle.bundleId, withBundlePricing(bundle));
  };

  public shared ({ caller }) func deleteLicenseBundle(bundleId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete license bundles");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    licenseBundles.remove(bundleId);
  };

  public shared ({ caller }) func updateBundleStatus(bundleId : Text, isActive : Bool) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update bundle status");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    switch (licenseBundles.get(bundleId)) {
      case (?bundle) {
        licenseBundles.add(bundleId, { bundle with isActive = isActive });
      };
      case null {};
    };
  };

  public query func getLicenseBundles() : async [LicenseBundle] {
    let allBundles = licenseBundles.values().toArray();
    allBundles
      .filter(func(bundle : LicenseBundle) : Bool { bundle.isActive })
      .sort(func(a : LicenseBundle, b : LicenseBundle) : { #less; #equal; #greater } {
        if (a.sortOrder < b.sortOrder) { #less }
        else if (a.sortOrder > b.sortOrder) { #greater }
        else { #equal }
      });
  };

  public query ({ caller }) func getAllLicenseBundles() : async [LicenseBundle] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view all license bundles");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    let allBundles = licenseBundles.values().toArray();
    allBundles.sort(func(a : LicenseBundle, b : LicenseBundle) : { #less; #equal; #greater } {
      if (a.sortOrder < b.sortOrder) { #less }
      else if (a.sortOrder > b.sortOrder) { #greater }
      else { #equal }
    });
  };

  public shared ({ caller }) func initializeDefaultLicenseBundles() : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can initialize default license bundles");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };

    let defaults : [LicenseBundle] = [
      {
        bundleId = "complete_annual";
        name = "BAMM Complete";
        priceInCentsAnnual = 34999;
        featureIds = ["paycheck_budget", "goals", "tx_simulator", "migration-management", "trades"];
        headline = "Every premium feature. One license.";
        bullets = ["All five premium modules", "Database Management included", "Save $90 vs à la carte"];
        badge = "Best value · Save $90";
        saveTextOverride = "";
        disclaimer = "";
        alaCarteSumCents = 0;
        savingsCents = 0;
        isActive = true;
        sortOrder = 1;
      },
      {
        bundleId = "planner_tax_annual";
        name = "Planner + Tax";
        priceInCentsAnnual = 16999;
        featureIds = ["paycheck_budget", "goals", "tx_simulator"];
        headline = "Plan your paycheck and your tax bill";
        bullets = ["Everything in Planner", "Tx Simulator", "Save $20 vs buying separately"];
        badge = "Best for planning";
        saveTextOverride = "";
        disclaimer = "";
        alaCarteSumCents = 0;
        savingsCents = 0;
        isActive = true;
        sortOrder = 2;
      },
      {
        bundleId = "pro_annual";
        name = "Pro Bundle";
        priceInCentsAnnual = 32999;
        featureIds = ["paycheck_budget", "goals", "tx_simulator", "trades"];
        headline = "Full planning plus Trades";
        bullets = ["Planner + Tax", "Trades", "For active paper traders"];
        badge = "";
        saveTextOverride = "";
        disclaimer = "Includes regulated modules — review disclaimers before checkout.";
        alaCarteSumCents = 0;
        savingsCents = 0;
        isActive = true;
        sortOrder = 3;
      },
      {
        bundleId = "planner_annual";
        name = "Planner Bundle";
        priceInCentsAnnual = 3499;
        featureIds = ["paycheck_budget", "goals"];
        headline = "Start strong with budgeting + goals";
        bullets = ["Paycheck Budget", "Goals", "Perfect first upgrade from BAMM Basic"];
        badge = "Entry bundle";
        saveTextOverride = "";
        disclaimer = "";
        alaCarteSumCents = 0;
        savingsCents = 0;
        isActive = true;
        sortOrder = 4;
      },
    ];

    for (bundle in defaults.vals()) {
      licenseBundles.add(bundle.bundleId, withBundlePricing(bundle));
    };
  };

  // Returns the full canonical list of license reference names used in RSA payloads.
  // The frontend dropdown uses this to let admins select the exact name for each feature.
  // NOTE: "Database Management" is the canonical name for the migration-management product ID.
  // There is no separate "Migration Management" entry — it maps to the same canonical name.
  public query func getLicenseReferenceNames() : async [Text] {
    [
      "Paycheck Budget",
      "Goals",
      "Tx Simulator",
      "Database Management",
      "Trades",
    ];
  };

  // RESEND configuration management
  public shared ({ caller }) func setResendConfiguration(config : ResendConfiguration) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can set RESEND configuration");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    // Trim whitespace from all fields before storing so values are always clean
    let trimmedSender = config.senderEmail.trim(#predicate(func c = c == ' '));
    resendConfig := ?{
      apiKey = config.apiKey.trim(#predicate(func c = c == ' '));
      baseUrl = config.baseUrl.trim(#predicate(func c = c == ' '));
      senderEmail = if (trimmedSender == "") { defaultSenderEmail } else { trimmedSender };
      serviceName = config.serviceName.trim(#predicate(func c = c == ' '));
    };
  };

  public query ({ caller }) func getResendConfiguration() : async ?ResendConfiguration {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view RESEND configuration");
    };
    resendConfig;
  };

  // Update RESEND service name (admin-only)
  public shared ({ caller }) func updateResendServiceName(serviceName : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update RESEND service name");
    };

    switch (resendConfig) {
      case null {
        Runtime.trap("RESEND configuration not set. Please configure RESEND settings first.");
      };
      case (?config) {
        resendConfig := ?{
          apiKey = config.apiKey;
          baseUrl = config.baseUrl;
          senderEmail = config.senderEmail;
          serviceName = serviceName.trim(#predicate(func c = c == ' '));
        };
      };
    };
  };

  // Test RESEND connection (admin-only)
  // Test RESEND connection (admin-only)
  public shared ({ caller }) func testResendConnection() : async EmailSendResult {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can test RESEND connection");
    };

    switch (resendConfig) {
      case null {
        #err("RESEND configuration not set");
      };
      case (?config) {
        let url = config.baseUrl # "/emails";
        // Trim whitespace from service name and sender email before constructing the from field
        // Use a verified sender domain, e.g. noreply@contact.bammservice.com
        let trimmedServiceName = config.serviceName.trim(#predicate(func c = c == ' '));
        let rawTestSenderEmail = config.senderEmail.trim(#predicate(func c = c == ' '));
        let trimmedSenderEmail = if (rawTestSenderEmail == "") { defaultSenderEmail } else { rawTestSenderEmail };
        let fromField = trimmedServiceName # " <" # trimmedSenderEmail # ">";
        let testBodyJson =
          "{" #
          "\"from\":\"" # fromField # "\"," #
          "\"to\":[\"" # trimmedSenderEmail # "\"]," #
          "\"subject\":\"BAMM RESEND Connection Test\"," #
          "\"html\":\"<p>RESEND connection test from BAMM Admin Panel.</p>\"" #
          "}";
        let requestHeaders : [OutCall.Header] = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # config.apiKey },
        ];
        try {
          let _responseText = await OutCall.httpPostRequest(url, requestHeaders, testBodyJson, transform);
          #ok("RESEND connection test successful");
        } catch (e) {
          #err("RESEND connection test failed: " # e.message());
        };
      };
    };
  };

  // Internal automated license generation — records a pending placeholder so the
  // admin panel shows the trial was initiated. Actual signing and email delivery
  // is performed by the frontend via getTrialLicensePayload -> client-side sign
  // -> sendSignedTrialLicenseEmail. Uses trial-eligible features only.
  func generateAndSendTrialLicenseInternal(name : Text, email : Text) : async () {
    // Idempotency check: skip if a trial_sent record already exists for this email today
    let nowNs = Time.now();
    let todayMs = nowNs / 1_000_000;
    let todayDateStr = msToIso(todayMs);
    var alreadySentToday = false;
    for ((_key, record) in licenseRecords.entries()) {
      if (
        record.recipientEmail == email and
        record.deliveryStatus == "trial_sent" and
        msToIso(record.generatedTimestamp / 1_000_000) == todayDateStr
      ) {
        alreadySentToday := true;
      };
    };
    if (alreadySentToday) { return };

    let trialProductNames = getTrialEligibleProductNamesInternal();
    let expiresMs = (nowNs / 1_000_000) + 30 * 24 * 60 * 60 * 1000;
    let expiresIso = msToIso(expiresMs);
    let generatedAtIso = nowNsToIso(nowNs);
    let expirationDate = nowNs + 30 * 24 * 60 * 60 * 1_000_000_000;
    let featuresJson = "[" # trialProductNames.map(func(f) { "\"" # f # "\"" }).values().join(", ") # "]";
    let licensePayloadJson =
      "{\"payload\":{\"features\":" # featuresJson #
      ",\"issued_to\":\"" # email # "\"" #
      ",\"expires\":\"" # expiresIso # "\"" #
      ",\"generated_by\":\"BAMM License Generation System\"" #
      ",\"generated_at\":\"" # generatedAtIso # "\"" #
      "},\"signature\":\"pending_frontend_signature\"}";
    let subject = emailAutomationSettings.emailSubject;
    let bodyText = "Hello " # name # ",\n" # emailAutomationSettings.emailBody;
    // Send email FIRST — only record if successful
    let result = await sendLicenseEmailWithResendFilename(email, licensePayloadJson, subject, bodyText, "30-days-Free.json");
    switch (result) {
      case (#ok(_)) {
        recordLicenseInternal(licensePayloadJson, email, trialProductNames, expirationDate, "trial_sent");
      };
      case (#err(e)) {
        await logEmailInternal(email, subject, "failed", ?e);
      };
    };
  };



  // Extracts a string field value from a JSON text (simple, non-nested)
  private func extractJsonStringField(json : Text, field : Text) : ?Text {
    // Try both compact ("key":"val") and spaced ("key": "val") formats
    let keyCompact = "\"" # field # "\":\"";
    let keySpaced  = "\"" # field # "\": \"";
    let tryExtract = func(key : Text) : ?Text {
      let parts = Array.fromIter(json.split(#text key));
      if (parts.size() < 2) return null;
      let afterKey = parts[1];
      let valueParts = Array.fromIter(afterKey.split(#text "\""));
      if (valueParts.size() < 1) return null;
      if (valueParts[0].size() == 0) return null;
      ?valueParts[0];
    };
    switch (tryExtract(keyCompact)) {
      case (?v) ?v;
      case null tryExtract(keySpaced);
    };
  };

  // Extracts a Nat field value from a JSON text (simple, non-nested)
  private func extractJsonNatField(json : Text, field : Text) : ?Nat {
    let key = "\"" # field # "\":";
    let parts = Array.fromIter(json.split(#text key));
    if (parts.size() < 2) return null;
    // Skip optional whitespace after the colon
    let afterKey = parts[1].trim(#predicate(func c = c == ' ' or c == '\t'));
    var numStr = "";
    label digitLoop for (c in afterKey.chars()) {
      if (c >= '0' and c <= '9') {
        numStr #= Text.fromChar(c);
      } else {
        break digitLoop;
      };
    };
    if (numStr == "") return null;
    Nat.fromText(numStr);
  };

  // Extracts a Nat field value from a JSON text — handles both compact and spaced formats:
  // "amount_total":52 and "amount_total": 52
  private func extractJsonNatFieldSpaced(json : Text, field : Text) : ?Nat {
    // Try compact first
    switch (extractJsonNatField(json, field)) {
      case (?v) { ?v };
      case null {
        // Try spaced key: "field": then skip whitespace
        let keySpaced = "\"" # field # "\": ";
        let parts = Array.fromIter(json.split(#text keySpaced));
        if (parts.size() < 2) return null;
        let afterKey = parts[1].trim(#predicate(func c = c == ' ' or c == '\t'));
        var numStr = "";
        label digitLoop for (c in afterKey.chars()) {
          if (c >= '0' and c <= '9') {
            numStr #= Text.fromChar(c);
          } else {
            break digitLoop;
          };
        };
        if (numStr == "") return null;
        Nat.fromText(numStr);
      };
    };
  };

  // Helper: extract last 4 characters of a text string
  private func last4Chars(t : Text) : Text {
    let chars = Array.fromIter(t.chars());
    let len = chars.size();
    if (len == 0) { return t };
    let start = if (len >= 4) len - 4 else 0;
    var result = "";
    var i = start;
    while (i < len) {
      result #= Text.fromChar(chars[i]);
      i += 1;
    };
    result;
  };

  // Maps a raw Stripe product/description string to canonical BAMM license feature names.
  // Bundle line items expand to all constituent features per @bamm/contracts bundles.json.
  private func expandLineItemToBammFeatures(raw : Text) : [Text] {
    switch (findBundleForLineItem(raw)) {
      case (?bundle) { bundleLicenseReferenceNames(bundle.featureIds) };
      case null {
        let lowerRaw = raw.toLower();
        if (lowerRaw.contains(#text "bamm complete") or lowerRaw.contains(#text "complete_annual")) {
          return ["Paycheck Budget", "Goals", "Tx Simulator", "Database Management", "Trades"];
        };
        if (lowerRaw.contains(#text "pro bundle") or lowerRaw.contains(#text "pro_annual")) {
          return ["Paycheck Budget", "Goals", "Tx Simulator", "Trades"];
        };
        if (
          lowerRaw.contains(#text "planner + tax")
          or lowerRaw.contains(#text "planner tax")
          or lowerRaw.contains(#text "planner_tax")
        ) {
          return ["Paycheck Budget", "Goals", "Tx Simulator"];
        };
        if (lowerRaw.contains(#text "planner bundle") or lowerRaw.contains(#text "planner_annual")) {
          return ["Paycheck Budget", "Goals"];
        };
        switch (mapToBammFeatureName(raw)) {
          case (?name) { [name] };
          case null { [] };
        };
      };
    };
  };

  // Maps a raw Stripe product/description string to an exact BAMM canonical license name.
  // Checks stored licenseReferenceName values first (exact match), then falls back to
  // case-insensitive partial matching against the canonical list.
  private func mapToBammFeatureName(raw : Text) : ?Text {
    let lowerRaw = raw.toLower();
    // First: check if any stored feature's licenseReferenceName matches exactly (or its display name)
    for ((_id, f) in licenseFeatures.entries()) {
      let refName = if (f.licenseReferenceName != "") { f.licenseReferenceName } else { f.name };
      if (refName.toLower() == lowerRaw or f.name.toLower() == lowerRaw) {
        return ?refName;
      };
    };
    // Fallback: canonical keyword matching
    if (lowerRaw.contains(#text "migration")) { ?"Database Management" }
    else if (lowerRaw.contains(#text "paycheck")) { ?"Paycheck Budget" }
    else if (lowerRaw.contains(#text "tx simulator") or lowerRaw.contains(#text "simulator")) { ?"Tx Simulator" }
    else if (lowerRaw.contains(#text "database")) { ?"Database Management" }
    else if (lowerRaw.contains(#text "trades")) { ?"Trades" }
    else if (lowerRaw.contains(#text "goals")) { ?"Goals" }
    else { null };
  };

  // Collects BAMM license feature names from checkout cart items (authoritative at checkout time).
  private func collectFeaturesFromShoppingItems(items : [Stripe.ShoppingItem]) : [Text] {
    let seenSet = Set.empty<Text>();
    let result = List.empty<Text>();
    let addFromRaw = func(raw : Text) {
      if (raw.size() == 0) { return };
      let lower = raw.toLower();
      if (lower.contains(#text "discount applied") or lower.contains(#text "promo code:")) { return };
      for (name in expandLineItemToBammFeatures(raw).vals()) {
        if (not seenSet.contains(name)) {
          seenSet.add(name);
          result.add(name);
        };
      };
    };
    for (item in items.vals()) {
      if (item.priceInCents > 0) {
        addFromRaw(item.productName);
        addFromRaw(item.productDescription);
      };
    };
    result.toArray();
  };

  // Scans a Stripe JSON body for known bundle names and canonical feature names.
  private func scanBodyForKnownPurchases(body : Text) : [Text] {
    let bodyLower = body.toLower();
    let seenSet = Set.empty<Text>();
    let result = List.empty<Text>();
    let addFeatures = func(names : [Text]) {
      for (name in names.vals()) {
        if (not seenSet.contains(name)) {
          seenSet.add(name);
          result.add(name);
        };
      };
    };
    for ((_id, bundle) in licenseBundles.entries()) {
      if (bundle.isActive) {
        let bundleNameLower = bundle.name.toLower();
        let bundleIdLower = bundle.bundleId.toLower();
        if (bodyLower.contains(#text bundleNameLower) or bodyLower.contains(#text bundleIdLower)) {
          addFeatures(bundleLicenseReferenceNames(bundle.featureIds));
        };
      };
    };
    let bundleHints = [
      "bamm complete",
      "complete_annual",
      "pro bundle",
      "pro_annual",
      "planner + tax",
      "planner tax",
      "planner_tax",
      "planner bundle",
      "planner_annual",
    ];
    for (hint in bundleHints.vals()) {
      if (bodyLower.contains(#text hint)) {
        addFeatures(expandLineItemToBammFeatures(hint));
      };
    };
    let canonicalNames = ["Paycheck Budget", "Goals", "Tx Simulator", "Database Management", "Trades"];
    for (canonicalName in canonicalNames.vals()) {
      if (bodyLower.contains(#text (canonicalName.toLower()))) {
        if (not seenSet.contains(canonicalName)) {
          seenSet.add(canonicalName);
          result.add(canonicalName);
        };
      };
    };
    result.toArray();
  };

  private func fetchStripeLineItemsBody(sessionId : Text, stripeKey : Text) : async ?Text {
    let url = "https://api.stripe.com/v1/checkout/sessions/" # sessionId # "/line_items?limit=20";
    try {
      let body = await OutCall.httpGetRequest(
        url,
        [{ name = "Authorization"; value = "Basic " # base64Encode(stripeKey # ":") }],
        transform
      );
      ?body;
    } catch (_) {
      null;
    };
  };

  private func resolvePurchasedFeatures(sessionId : Text, sessionBody : Text, stripeKey : Text) : async ([Text], Text) {
    let fromSession = extractLineItemDescriptions(sessionBody);
    if (fromSession.size() > 0) {
      return (fromSession, "stripe_session_line_items");
    };
    switch (sessionPurchasedFeatures.get(sessionId)) {
      case (?stored) {
        if (stored.size() > 0) { return (stored, "checkout_snapshot"); };
      };
      case null {};
    };
    let fromScan = scanBodyForKnownPurchases(sessionBody);
    if (fromScan.size() > 0) {
      return (fromScan, "session_body_scan");
    };
    switch (await fetchStripeLineItemsBody(sessionId, stripeKey)) {
      case (?lineItemsBody) {
        let fromLineItems = extractLineItemDescriptions(lineItemsBody);
        if (fromLineItems.size() > 0) {
          return (fromLineItems, "stripe_line_items_api");
        };
        let fromLineItemsScan = scanBodyForKnownPurchases(lineItemsBody);
        if (fromLineItemsScan.size() > 0) {
          return (fromLineItemsScan, "line_items_body_scan");
        };
      };
      case null {};
    };
    ([], "none");
  };

  private func extractLineItemsJsonSlice(json : Text) : Text {
    let markers = ["\"line_items\":{", "\"line_items\": {"];
    for (marker in markers.vals()) {
      let parts = Array.fromIter(json.split(#text marker));
      if (parts.size() >= 2) {
        return parts[1];
      };
    };
    json;
  };

  // Extracts Stripe line_items product names and maps them to exact BAMM feature names.
  // Stripe may return product names in: "description", "nickname", or nested "name" fields.
  // Strategy: scan line_items slice first, then fall back to full body.
  private func extractLineItemDescriptions(json : Text) : [Text] {
    let lineItemsSlice = extractLineItemsJsonSlice(json);
    let fromSlice = extractLineItemDescriptionsFromJson(lineItemsSlice);
    if (fromSlice.size() > 0) { fromSlice } else {
      extractLineItemDescriptionsFromJson(json);
    };
  };

  private func extractLineItemDescriptionsFromJson(json : Text) : [Text] {
    let seenSet = Set.empty<Text>();
    let result = List.empty<Text>();

    let tryExtractFromField = func(delimiter : Text) {
      let parts = Array.fromIter(json.split(#text delimiter));
      var i = 1;
      while (i < parts.size()) {
        let valueParts = Array.fromIter(parts[i].split(#text "\""));
        if (valueParts.size() >= 1 and valueParts[0].size() > 0) {
          for (bammName in expandLineItemToBammFeatures(valueParts[0]).vals()) {
            if (not seenSet.contains(bammName)) {
              seenSet.add(bammName);
              result.add(bammName);
            };
          };
        };
        i += 1;
      };
    };

    // description — compact and spaced JSON
    tryExtractFromField("\"description\":\"");
    tryExtractFromField("\"description\": \"");
    tryExtractFromField("\"nickname\":\"");
    tryExtractFromField("\"nickname\": \"");
    tryExtractFromField("\"display_name\":\"");
    tryExtractFromField("\"display_name\": \"");
    // product_data from checkout creation and expanded price.product
    tryExtractFromField("\"product_data\":{\"name\":\"");
    tryExtractFromField("\"product_data\": {\"name\": \"");
    tryExtractFromField("\"product_data\":{\"description\":\"");
    tryExtractFromField("\"product_data\": {\"description\": \"");

    if (result.size() == 0) {
      tryExtractFromField("\"name\":\"");
      tryExtractFromField("\"name\": \"");
    };

    result.toArray();
  };

  // Extracts a string value nested one level inside a JSON object field.
  // e.g. extractNestedJsonStringField(json, "customer_details", "name")
  // finds the first occurrence of "customer_details":{..."name":"VALUE"...
  private func extractNestedJsonStringField(json : Text, outerField : Text, innerField : Text) : ?Text {
    let outerKey = "\"" # outerField # "\":{";
    var outerParts = Array.fromIter(json.split(#text outerKey));
    if (outerParts.size() < 2) {
      let outerKeySpaced = "\"" # outerField # "\": {";
      outerParts := Array.fromIter(json.split(#text outerKeySpaced));
    };
    if (outerParts.size() < 2) return null;
    // Take everything after the first occurrence of the outer object open brace
    let afterOpen = outerParts[1];
    // Bound the search: find the closing brace of this nested object.
    // We track brace depth so nested objects inside are handled correctly.
    var depth = 1;
    var boundedJson = "";
    var done = false;
    for (c in afterOpen.chars()) {
      if (done) {}  // already found closing brace — ignore remainder
      else if (c == '{') {
        depth += 1;
        boundedJson := boundedJson # Text.fromChar(c);
      } else if (c == '}') {
        depth -= 1;
        if (depth == 0) {
          done := true;  // do NOT append the closing brace — search is now bounded
        } else {
          boundedJson := boundedJson # Text.fromChar(c);
        };
      } else {
        boundedJson := boundedJson # Text.fromChar(c);
      };
    };
    // Only search for innerField within the bounded nested object content
    extractJsonStringField(boundedJson, innerField);
  };

  // Extracts the features array from a signed license JSON string.
  // Looks for "\"features\":[" and parses the array content between brackets.
  // Returns null if parsing fails or the key is not found.
  private func extractFeaturesFromSignedJson(signedJson : Text) : ?[Text] {
    let marker = "\"features\":[";
    var segments : [Text] = [];
    var count = 0;
    for (seg in signedJson.split(#text marker)) {
      if (count == 0) { segments := [seg]; }
      else if (count == 1) { segments := [segments[0], seg]; };
      count += 1;
    };
    if (segments.size() < 2) { return null; };
    let afterFeatures = segments[1];
    var arrayContent = "";
    for (c in afterFeatures.chars()) {
      if (c == ']') { return processFeatureContent(arrayContent); };
      arrayContent := arrayContent # Text.fromChar(c);
    };
    null
  };

  private func processFeatureContent(content : Text) : ?[Text] {
    if (content.size() == 0) { return ?[]; };
    let rawItems = Array.fromIter(content.split(#char ','));
    let cleaned = rawItems.map(func(raw : Text) : Text {
      var result = "";
      var inString = false;
      for (c in raw.chars()) {
        if (c == '\"') { inString := not inString; }
        else if (inString or (c != ' ')) { result := result # Text.fromChar(c); };
      };
      result
    });
    let nonEmpty = cleaned.filter(func(f : Text) : Bool { f.size() > 0 });
    if (nonEmpty.size() == 0) { return null; };
    ?nonEmpty
  };

  // Server-side trial license issuance (P0.1 / SEC-001). Replaces client-side signing.
  public shared func issueTrialLicenseAndEmail(name : Text, email : Text) : async {
    #ok : Text;
    #err : Text;
  } {
    switch (userSubmissions.get(email)) {
      case null { return #err("No download submission found for this email. Submit the download form first.") };
      case (?_) {};
    };
    if (not privateKeyConfigured()) {
      return #err("License signing is temporarily unavailable. Please contact support@bammservice.com.");
    };

    let nowNs = Time.now();
    let todayDateStr = msToIso(nowNs / 1_000_000);
    for ((_key, record) in licenseRecords.entries()) {
      if (
        record.recipientEmail == email and
        record.deliveryStatus == "trial_sent" and
        msToIso(record.generatedTimestamp / 1_000_000) == todayDateStr
      ) {
        return #ok("Trial license already sent to " # email # " today.");
      };
    };

    let trialFeatures = getTrialEligibleProductNamesInternal();
    if (trialFeatures.size() == 0) {
      return #err("No trial-eligible features are configured.");
    };

    let expiresMs = (nowNs / 1_000_000) + 30 * 24 * 60 * 60 * 1000;
    let expiresDateOnly = msToIso(expiresMs);
    let generatedAtIso = nowNsToIso(nowNs);
    let expirationDate = nowNs + 30 * 24 * 60 * 60 * 1_000_000_000;
    let payloadJson = buildLicensePayloadJson(trialFeatures, email, expiresDateOnly, generatedAtIso);
    let signedLicenseJson = switch (signPayloadJsonInternal(payloadJson)) {
      case null { return #err("License signing failed. Contact support.") };
      case (?signed) signed;
    };

    let subject = emailAutomationSettings.emailSubject;
    let bodyText = "Hello " # name # ",\n" # emailAutomationSettings.emailBody;
    let result = await sendLicenseEmailWithResendFilename(email, signedLicenseJson, subject, bodyText, "30-days-Free.json");
    switch (result) {
      case (#ok(_)) {
        recordLicenseInternal(signedLicenseJson, email, trialFeatures, expirationDate, "trial_sent");
        #ok("Trial license sent to " # email);
      };
      case (#err(e)) {
        await logEmailInternal(email, subject, "failed", ?e);
        #err("Failed to send trial license email: " # e);
      };
    };
  };

  // Public endpoint — called from the download success page.
  // DEPRECATED: client-supplied signatures are rejected (SEC-001). Use issueTrialLicenseAndEmail.
  public shared func sendTrialLicenseEmail(name : Text, email : Text, signedLicenseJson : Text) : async () {
    ignore name;
    ignore email;
    ignore signedLicenseJson;
    Runtime.trap("sendTrialLicenseEmail is deprecated. Use issueTrialLicenseAndEmail.");
  };

  // Helper function to get premium features (internal synchronous use only)
  // This is a private helper function used only by internal automated processes
  // It does not expose data externally and is not callable from outside the canister
  func getPremiumLicenseFeaturesInternal() : [LicenseFeature] {
    let allFeatures = licenseFeatures.values().toArray();
    allFeatures.filter(
      func(feature : LicenseFeature) : Bool {
        feature.isPremium and feature.isActive;
      },
    );
  };

  // Features excluded from the 30-day free trial — require a separate training
  // subscription and user agreement not yet implemented.
  let trialExcludedFeatures : [Text] = ["Trades", "Tx Simulator"];

  // ── DDR-003 chunked installers (MUST stay after all pre-existing actor fields for EOP) ──
  let installerChunkMaxBytes : Nat = 1_500_000;

  var macInstallerStore : ?{
    fileName : Text;
    mimeType : Text;
    totalSize : Nat;
    chunks : [Blob];
  } = null;

  var windowsInstallerStore : ?{
    fileName : Text;
    mimeType : Text;
    totalSize : Nat;
    chunks : [Blob];
  } = null;

  var macUploadActive : Bool = false;
  var macUploadFileName : Text = "";
  var macUploadMime : Text = "";
  var macUploadTotalSize : Nat = 0;
  var macUploadTotalChunks : Nat = 0;
  var macUploadReceived : Nat = 0;
  var macUploadChunks = Map.empty<Nat, Blob>();

  var windowsUploadActive : Bool = false;
  var windowsUploadFileName : Text = "";
  var windowsUploadMime : Text = "";
  var windowsUploadTotalSize : Nat = 0;
  var windowsUploadTotalChunks : Nat = 0;
  var windowsUploadReceived : Nat = 0;
  var windowsUploadChunks = Map.empty<Nat, Blob>();

  func isExcludedFromTrial(name : Text) : Bool {
    trialExcludedFeatures.contains(name);
  };

  // Returns names of all active Products (used for license feature arrays)
  // Returns names of all active licenseFeatures (authoritative source for license feature names)
  // Returns canonical license names for all active features (used in RSA payloads).
  // Uses licenseReferenceName if non-empty, otherwise falls back to name.
  func getActiveProductNamesInternal() : [Text] {
    let allFeatures = licenseFeatures.values().toArray();
    allFeatures
      .filter(func(f : LicenseFeature) : Bool { f.isActive })
      .map<LicenseFeature, Text>(func(f) {
        if (f.licenseReferenceName != "") { f.licenseReferenceName } else { f.name }
      });
  };

  // Returns active product names eligible for the 30-day free trial.
  // Always excludes Trades and Tx Simulator regardless of their active status.
  func getTrialEligibleProductNamesInternal() : [Text] {
    getActiveProductNamesInternal()
      .filter(func(name : Text) : Bool { not isExcludedFromTrial(name) });
  };

  // Returns the unsigned trial license payload JSON for a given email.
  // Uses trial-eligible features only (Trades and Tx Simulator are excluded).
  // The frontend signs this with the uploaded private key via SubtleCrypto,
  // then passes the signed JSON to sendSignedTrialLicenseEmail.
  public func getTrialLicensePayload(email : Text) : async Text {
    let activeProductNames = getTrialEligibleProductNamesInternal();
    let nowNs = Time.now();
    let expiresMs = (nowNs / 1_000_000) + 30 * 24 * 60 * 60 * 1000;
    let expiresIso = msToIso(expiresMs);
    let generatedAtIso = nowNsToIso(nowNs);
    let featuresJson = "[" # activeProductNames.map(func(f) { "\"" # f # "\"" }).values().join(", ") # "]";
    "{\"features\":" # featuresJson #
    ",\"issued_to\":\"" # email # "\"" #
    ",\"expires\":\"" # expiresIso # "\"" #
    ",\"generated_by\":\"BAMM License Generation System\"" #
    ",\"generated_at\":\"" # generatedAtIso # "\"}";
  };

  // Accepts a fully signed license JSON from the frontend, base64-encodes it,
  // and sends it as a .json attachment via RESEND.
  // DEPRECATED for non-admin flows — use issueTrialLicenseAndEmail (SEC-001).
  public func sendSignedTrialLicenseEmail(email : Text, name : Text, signedLicenseJson : Text) : async Bool {
    ignore name;
    ignore signedLicenseJson;
    await logEmailInternal(email, "deprecated_endpoint", "failed", ?"sendSignedTrialLicenseEmail is deprecated");
    false;
  };

  // Admin function to resend trial license to an existing submission email
  // (e.g., after the user lost their email). Generates a fresh RSA-payload license
  // and sends it via RESEND as a 30-days-Free.json attachment.
  public shared ({ caller }) func resendTrialLicense(email : Text) : async {
    #ok : Text;
    #err : Text;
  } {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can resend trial licenses");
    };

    // Verify submission exists
    let submissionName = switch (userSubmissions.get(email)) {
      case null { return #err("No submission found for email: " # email) };
      case (?sub) { sub.name };
    };

    let trialProductNames = getTrialEligibleProductNamesInternal();
    let nowNs = Time.now();
    let expiresMs = (nowNs / 1_000_000) + 30 * 24 * 60 * 60 * 1000;
    let expiresIso = msToIso(expiresMs);
    let generatedAtIso = nowNsToIso(nowNs);
    let expirationDate = nowNs + 30 * 24 * 60 * 60 * 1_000_000_000;
    let featuresJson = "[" # trialProductNames.map(func(f) { "\"" # f # "\"" }).values().join(", ") # "]";
    let licensePayloadJson =
      "{\"payload\":{\"features\":" # featuresJson #
      ",\"issued_to\":\"" # email # "\"" #
      ",\"expires\":\"" # expiresIso # "\"" #
      ",\"generated_by\":\"BAMM License Generation System\"" #
      ",\"generated_at\":\"" # generatedAtIso # "\"" #
      "},\"signature\":\"pending_frontend_signature\"}";

    recordLicenseInternal(licensePayloadJson, email, trialProductNames, expirationDate, "trial_resent");

    let subject = emailAutomationSettings.emailSubject;
    let bodyText = "Hello " # submissionName # ",\n" # emailAutomationSettings.emailBody;
    let result = await sendLicenseEmailWithResendFilename(email, licensePayloadJson, subject, bodyText, "30-days-Free.json");
    switch (result) {
      case (#ok(msg)) { #ok("Trial license resent to " # email # ". " # msg) };
      case (#err(e)) {
        await logEmailInternal(email, subject, "failed", ?e);
        #err("Failed to resend trial license to " # email # ": " # e);
      };
    };
  };

  // Returns names of all active Products (admin query for UI feature selection)
  public query func getActivePremiumProductNames() : async [Text] {
    getActiveProductNamesInternal();
  };

  // Returns features eligible for the 30-day free trial (excludes Trades & Tx Simulator)
  public query func getTrialEligibleProductNames() : async [Text] {
    getTrialEligibleProductNamesInternal();
  };

  // Converts epoch milliseconds to ISO 8601 date string YYYY-MM-DD
  func msToIso(ms : Int) : Text {
    let seconds = ms / 1000;
    let days = seconds / 86400;
    var z = days + 719468;
    var era = if (z >= 0) { z / 146097 } else { (z - 146096) / 146097 };
    var doe = z - era * 146097;
    var yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    var mp = (5 * doy + 2) / 153;
    var d = doy - (153 * mp + 2) / 5 + 1;
    var m = if (mp < 10) { mp + 3 } else { mp - 9 };
    if (m <= 2) { y := y + 1 };
    let yStr = y.toText();
    let mStr = if (m < 10) { "0" # m.toText() } else { m.toText() };
    let dStr = if (d < 10) { "0" # d.toText() } else { d.toText() };
    yStr # "-" # mStr # "-" # dStr;
  };

  // Converts nanosecond timestamp to ISO 8601 datetime string YYYY-MM-DDTHH:MM:SS.mmmZ
  func nowNsToIso(ns : Int) : Text {
    let ms = ns / 1_000_000;
    let dateStr = msToIso(ms);
    let secondsInDay = (ms / 1000) % 86400;
    let hh = secondsInDay / 3600;
    let mm = (secondsInDay % 3600) / 60;
    let ss = secondsInDay % 60;
    let millis = ms % 1000;
    let hhStr = if (hh < 10) { "0" # hh.toText() } else { hh.toText() };
    let mmStr = if (mm < 10) { "0" # mm.toText() } else { mm.toText() };
    let ssStr = if (ss < 10) { "0" # ss.toText() } else { ss.toText() };
    let msStr =
      if (millis < 10) { "00" # millis.toText() }
      else if (millis < 100) { "0" # millis.toText() }
      else { millis.toText() };
    dateStr # "T" # hhStr # ":" # mmStr # ":" # ssStr # "." # msStr # "Z";
  };

  // Base64-encodes a UTF-8 text string (RFC 4648)
  // Base64-encodes a UTF-8 text string (RFC 4648)
  func base64Encode(input : Text) : Text {
    let table : [Text] = [
      "A","B","C","D","E","F","G","H","I","J","K","L","M",
      "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
      "a","b","c","d","e","f","g","h","i","j","k","l","m",
      "n","o","p","q","r","s","t","u","v","w","x","y","z",
      "0","1","2","3","4","5","6","7","8","9","+","/",
    ];
    let bytes = input.encodeUtf8();
    let n = bytes.size();
    var result = "";
    var i = 0;
    while (i + 2 < n) {
      let b0 : Nat8 = bytes[i];
      let b1 : Nat8 = bytes[i + 1];
      let b2 : Nat8 = bytes[i + 2];
      result #= table[(b0 >> 2).toNat()];
      result #= table[((b0 & 0x03) << 4 | b1 >> 4).toNat()];
      result #= table[((b1 & 0x0f) << 2 | b2 >> 6).toNat()];
      result #= table[(b2 & 0x3f).toNat()];
      i += 3;
    };
    if (i + 1 == n) {
      let b0 : Nat8 = bytes[i];
      result #= table[(b0 >> 2).toNat()];
      result #= table[((b0 & 0x03) << 4).toNat()];
      result #= "==";
    } else if (i + 2 == n) {
      let b0 : Nat8 = bytes[i];
      let b1 : Nat8 = bytes[i + 1];
      result #= table[(b0 >> 2).toNat()];
      result #= table[((b0 & 0x03) << 4 | b1 >> 4).toNat()];
      result #= table[((b1 & 0x0f) << 2).toNat()];
      result #= "=";
    };
    result;
  };

  // ── Installer helpers (DDR-003 chunked + persistent) ─────────────────────

  func requireInstallerAdmin(caller : Principal) {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can manage installer files");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
  };

  func buildChunkArray(chunkMap : Map.Map<Nat, Blob>, totalChunks : Nat) : ?[Blob] {
    if (totalChunks == 0) { return null };
    var out : [Blob] = [];
    var i : Nat = 0;
    while (i < totalChunks) {
      switch (chunkMap.get(i)) {
        case null { return null };
        case (?blob) { out := out.concat([blob]) };
      };
      i += 1;
    };
    ?out;
  };

  func clearMacUploadSession() {
    macUploadActive := false;
    macUploadFileName := "";
    macUploadMime := "";
    macUploadTotalSize := 0;
    macUploadTotalChunks := 0;
    macUploadReceived := 0;
    macUploadChunks := Map.empty<Nat, Blob>();
  };

  func clearWindowsUploadSession() {
    windowsUploadActive := false;
    windowsUploadFileName := "";
    windowsUploadMime := "";
    windowsUploadTotalSize := 0;
    windowsUploadTotalChunks := 0;
    windowsUploadReceived := 0;
    windowsUploadChunks := Map.empty<Nat, Blob>();
  };

  public query func getInstallerChunkMaxBytes() : async Nat {
    installerChunkMaxBytes;
  };

  // Mac installer file management
  /// Legacy single-shot upload — only for files ≤ chunk max. Prefer begin/chunk/finalize for DMG/EXE.
  public shared ({ caller }) func uploadMacInstaller(file : Blob, fileName : Text) : async Bool {
    requireInstallerAdmin(caller);
    if (not fileName.endsWith(#text ".dmg")) {
      Runtime.trap("Invalid file type. Only .dmg files are allowed for Mac installer.");
    };
    if (file.size() > installerChunkMaxBytes) {
      Runtime.trap(
        "File too large for single-shot upload (" # file.size().toText() # " bytes). " #
        "Use beginMacInstallerUpload / uploadMacInstallerChunk / finalizeMacInstallerUpload " #
        "(max " # installerChunkMaxBytes.toText() # " bytes per chunk)."
      );
    };
    macInstallerStore := ?{
      fileName;
      mimeType = "application/x-apple-diskimage";
      totalSize = file.size();
      chunks = [file];
    };
    macInstallerFile := null;
    clearMacUploadSession();
    true;
  };

  public shared ({ caller }) func beginMacInstallerUpload(
    fileName : Text,
    totalSize : Nat,
    totalChunks : Nat,
  ) : async Result.Result<Text, Text> {
    requireInstallerAdmin(caller);
    if (not fileName.endsWith(#text ".dmg")) {
      return #err("Invalid file type. Only .dmg files are allowed for Mac installer.");
    };
    if (totalChunks == 0 or totalSize == 0) {
      return #err("totalSize and totalChunks must be > 0");
    };
    let maxTotal = totalChunks * installerChunkMaxBytes;
    if (totalSize > maxTotal) {
      return #err("totalSize exceeds totalChunks × chunk max");
    };
    clearMacUploadSession();
    macUploadActive := true;
    macUploadFileName := fileName;
    macUploadMime := "application/x-apple-diskimage";
    macUploadTotalSize := totalSize;
    macUploadTotalChunks := totalChunks;
    #ok("Mac installer upload session started (" # totalChunks.toText() # " chunks)");
  };

  public shared ({ caller }) func uploadMacInstallerChunk(chunkIndex : Nat, chunk : Blob) : async Result.Result<Text, Text> {
    requireInstallerAdmin(caller);
    if (not macUploadActive) {
      return #err("No active Mac installer upload session — call beginMacInstallerUpload first");
    };
    if (chunkIndex >= macUploadTotalChunks) {
      return #err("chunkIndex out of range");
    };
    if (chunk.size() == 0) {
      return #err("Empty chunk");
    };
    if (chunk.size() > installerChunkMaxBytes) {
      return #err("Chunk exceeds max " # installerChunkMaxBytes.toText() # " bytes");
    };
    let replacing = switch (macUploadChunks.get(chunkIndex)) {
      case null { false };
      case (?_) { true };
    };
    macUploadChunks.add(chunkIndex, chunk);
    if (not replacing) {
      macUploadReceived += 1;
    };
    #ok(
      "Mac chunk " # (chunkIndex + 1).toText() # "/" # macUploadTotalChunks.toText() #
      " stored (" # chunk.size().toText() # " bytes)"
    );
  };

  public shared ({ caller }) func finalizeMacInstallerUpload() : async Result.Result<Text, Text> {
    requireInstallerAdmin(caller);
    if (not macUploadActive) {
      return #err("No active Mac installer upload session");
    };
    if (macUploadReceived != macUploadTotalChunks) {
      return #err(
        "Missing chunks: received " # macUploadReceived.toText() #
        " of " # macUploadTotalChunks.toText()
      );
    };
    switch (buildChunkArray(macUploadChunks, macUploadTotalChunks)) {
      case null { return #err("Failed to assemble Mac installer chunks") };
      case (?chunks) {
        var assembled : Nat = 0;
        for (c in chunks.values()) { assembled += c.size() };
        if (assembled != macUploadTotalSize) {
          return #err(
            "Size mismatch: assembled " # assembled.toText() #
            " vs expected " # macUploadTotalSize.toText()
          );
        };
        macInstallerStore := ?{
          fileName = macUploadFileName;
          mimeType = macUploadMime;
          totalSize = macUploadTotalSize;
          chunks;
        };
        macInstallerFile := null;
        let name = macUploadFileName;
        clearMacUploadSession();
        #ok("Mac installer committed: " # name);
      };
    };
  };

  public shared ({ caller }) func cancelMacInstallerUpload() : async () {
    requireInstallerAdmin(caller);
    clearMacUploadSession();
  };

  public query ({ caller }) func getMacInstallerMeta() : async ?InstallerMeta {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can access Mac installer metadata");
    };
    switch (macInstallerStore) {
      case (?s) {
        ?{
          fileName = s.fileName;
          mimeType = s.mimeType;
          totalSize = s.totalSize;
          chunkCount = s.chunks.size();
        };
      };
      case null {
        switch (macInstallerFile) {
          case null { null };
          case (?f) {
            ?{
              fileName = f.fileName;
              mimeType = f.mimeType;
              totalSize = f.file.size();
              chunkCount = 1;
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getMacInstallerFile() : async ?{
    file : Blob;
    fileName : Text;
    mimeType : Text;
  } {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can access Mac installer files");
    };
    // Admin UI only needs metadata; avoid returning multi‑MiB payloads.
    switch (macInstallerStore) {
      case (?s) {
        ?{
          file = Blob.fromArray([]);
          fileName = s.fileName;
          mimeType = s.mimeType;
        };
      };
      case null { macInstallerFile };
    };
  };

  // Public Mac installer download — legacy single blob (small files / old data only).
  public query func downloadMacInstaller() : async InstallerDownloadResult {
    switch (macInstallerStore) {
      case (?s) {
        if (s.chunks.size() == 1) {
          #ok({
            file = s.chunks[0];
            fileName = s.fileName;
            mimeType = s.mimeType;
          });
        } else {
          #err(
            "Mac installer is chunked (" # s.chunks.size().toText() #
            " parts). Use getPublicMacInstallerMeta + downloadMacInstallerChunk."
          );
        };
      };
      case null {
        switch (macInstallerFile) {
          case null {
            #err("Mac installer not available. Please contact support.");
          };
          case (?installer) {
            #ok({
              file = installer.file;
              fileName = installer.fileName;
              mimeType = installer.mimeType;
            });
          };
        };
      };
    };
  };

  public query func getPublicMacInstallerMeta() : async ?InstallerMeta {
    switch (macInstallerStore) {
      case (?s) {
        ?{
          fileName = s.fileName;
          mimeType = s.mimeType;
          totalSize = s.totalSize;
          chunkCount = s.chunks.size();
        };
      };
      case null {
        switch (macInstallerFile) {
          case null { null };
          case (?f) {
            ?{
              fileName = f.fileName;
              mimeType = f.mimeType;
              totalSize = f.file.size();
              chunkCount = 1;
            };
          };
        };
      };
    };
  };

  public query func downloadMacInstallerChunk(chunkIndex : Nat) : async InstallerChunkResult {
    switch (macInstallerStore) {
      case (?s) {
        if (chunkIndex >= s.chunks.size()) {
          return #err("chunkIndex out of range");
        };
        #ok({
          chunk = s.chunks[chunkIndex];
          chunkIndex;
          chunkCount = s.chunks.size();
        });
      };
      case null {
        switch (macInstallerFile) {
          case null {
            #err("Mac installer not available. Please contact support.");
          };
          case (?f) {
            if (chunkIndex != 0) { return #err("chunkIndex out of range") };
            #ok({
              chunk = f.file;
              chunkIndex = 0;
              chunkCount = 1;
            });
          };
        };
      };
    };
  };

  /// Public metadata only (DDR-029) — file names for version display without downloading blobs.
  public query func getInstallerFileNames() : async {
    macFileName : ?Text;
    windowsFileName : ?Text;
  } {
    {
      macFileName = switch (macInstallerStore) {
        case (?s) { ?s.fileName };
        case null {
          switch (macInstallerFile) {
            case null { null };
            case (?installer) { ?installer.fileName };
          };
        };
      };
      windowsFileName = switch (windowsInstallerStore) {
        case (?s) { ?s.fileName };
        case null {
          switch (windowsInstallerFile) {
            case null { null };
            case (?installer) { ?installer.fileName };
          };
        };
      };
    };
  };

  // Windows installer file management
  public shared ({ caller }) func uploadWindowsInstaller(file : Blob, fileName : Text) : async Bool {
    requireInstallerAdmin(caller);
    if (not fileName.endsWith(#text ".exe")) {
      Runtime.trap("Invalid file type. Only .exe files are allowed for Windows installer.");
    };
    if (file.size() > installerChunkMaxBytes) {
      Runtime.trap(
        "File too large for single-shot upload (" # file.size().toText() # " bytes). " #
        "Use beginWindowsInstallerUpload / uploadWindowsInstallerChunk / finalizeWindowsInstallerUpload " #
        "(max " # installerChunkMaxBytes.toText() # " bytes per chunk)."
      );
    };
    windowsInstallerStore := ?{
      fileName;
      mimeType = "application/vnd.microsoft.portable-executable";
      totalSize = file.size();
      chunks = [file];
    };
    windowsInstallerFile := null;
    clearWindowsUploadSession();
    true;
  };

  public shared ({ caller }) func beginWindowsInstallerUpload(
    fileName : Text,
    totalSize : Nat,
    totalChunks : Nat,
  ) : async Result.Result<Text, Text> {
    requireInstallerAdmin(caller);
    if (not fileName.endsWith(#text ".exe")) {
      return #err("Invalid file type. Only .exe files are allowed for Windows installer.");
    };
    if (totalChunks == 0 or totalSize == 0) {
      return #err("totalSize and totalChunks must be > 0");
    };
    let maxTotal = totalChunks * installerChunkMaxBytes;
    if (totalSize > maxTotal) {
      return #err("totalSize exceeds totalChunks × chunk max");
    };
    clearWindowsUploadSession();
    windowsUploadActive := true;
    windowsUploadFileName := fileName;
    windowsUploadMime := "application/vnd.microsoft.portable-executable";
    windowsUploadTotalSize := totalSize;
    windowsUploadTotalChunks := totalChunks;
    #ok("Windows installer upload session started (" # totalChunks.toText() # " chunks)");
  };

  public shared ({ caller }) func uploadWindowsInstallerChunk(chunkIndex : Nat, chunk : Blob) : async Result.Result<Text, Text> {
    requireInstallerAdmin(caller);
    if (not windowsUploadActive) {
      return #err("No active Windows installer upload session — call beginWindowsInstallerUpload first");
    };
    if (chunkIndex >= windowsUploadTotalChunks) {
      return #err("chunkIndex out of range");
    };
    if (chunk.size() == 0) {
      return #err("Empty chunk");
    };
    if (chunk.size() > installerChunkMaxBytes) {
      return #err("Chunk exceeds max " # installerChunkMaxBytes.toText() # " bytes");
    };
    let replacing = switch (windowsUploadChunks.get(chunkIndex)) {
      case null { false };
      case (?_) { true };
    };
    windowsUploadChunks.add(chunkIndex, chunk);
    if (not replacing) {
      windowsUploadReceived += 1;
    };
    #ok(
      "Windows chunk " # (chunkIndex + 1).toText() # "/" # windowsUploadTotalChunks.toText() #
      " stored (" # chunk.size().toText() # " bytes)"
    );
  };

  public shared ({ caller }) func finalizeWindowsInstallerUpload() : async Result.Result<Text, Text> {
    requireInstallerAdmin(caller);
    if (not windowsUploadActive) {
      return #err("No active Windows installer upload session");
    };
    if (windowsUploadReceived != windowsUploadTotalChunks) {
      return #err(
        "Missing chunks: received " # windowsUploadReceived.toText() #
        " of " # windowsUploadTotalChunks.toText()
      );
    };
    switch (buildChunkArray(windowsUploadChunks, windowsUploadTotalChunks)) {
      case null { return #err("Failed to assemble Windows installer chunks") };
      case (?chunks) {
        var assembled : Nat = 0;
        for (c in chunks.values()) { assembled += c.size() };
        if (assembled != windowsUploadTotalSize) {
          return #err(
            "Size mismatch: assembled " # assembled.toText() #
            " vs expected " # windowsUploadTotalSize.toText()
          );
        };
        windowsInstallerStore := ?{
          fileName = windowsUploadFileName;
          mimeType = windowsUploadMime;
          totalSize = windowsUploadTotalSize;
          chunks;
        };
        windowsInstallerFile := null;
        let name = windowsUploadFileName;
        clearWindowsUploadSession();
        #ok("Windows installer committed: " # name);
      };
    };
  };

  public shared ({ caller }) func cancelWindowsInstallerUpload() : async () {
    requireInstallerAdmin(caller);
    clearWindowsUploadSession();
  };

  public query ({ caller }) func getWindowsInstallerMeta() : async ?InstallerMeta {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can access Windows installer metadata");
    };
    switch (windowsInstallerStore) {
      case (?s) {
        ?{
          fileName = s.fileName;
          mimeType = s.mimeType;
          totalSize = s.totalSize;
          chunkCount = s.chunks.size();
        };
      };
      case null {
        switch (windowsInstallerFile) {
          case null { null };
          case (?f) {
            ?{
              fileName = f.fileName;
              mimeType = f.mimeType;
              totalSize = f.file.size();
              chunkCount = 1;
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getWindowsInstallerFile() : async ?{
    file : Blob;
    fileName : Text;
    mimeType : Text;
  } {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can access Windows installer files");
    };
    switch (windowsInstallerStore) {
      case (?s) {
        ?{
          file = Blob.fromArray([]);
          fileName = s.fileName;
          mimeType = s.mimeType;
        };
      };
      case null { windowsInstallerFile };
    };
  };

  public query func downloadWindowsInstaller() : async InstallerDownloadResult {
    switch (windowsInstallerStore) {
      case (?s) {
        if (s.chunks.size() == 1) {
          #ok({
            file = s.chunks[0];
            fileName = s.fileName;
            mimeType = s.mimeType;
          });
        } else {
          #err(
            "Windows installer is chunked (" # s.chunks.size().toText() #
            " parts). Use getPublicWindowsInstallerMeta + downloadWindowsInstallerChunk."
          );
        };
      };
      case null {
        switch (windowsInstallerFile) {
          case null {
            #err("Windows installer not available. Please contact support.");
          };
          case (?installer) {
            #ok({
              file = installer.file;
              fileName = installer.fileName;
              mimeType = installer.mimeType;
            });
          };
        };
      };
    };
  };

  public query func getPublicWindowsInstallerMeta() : async ?InstallerMeta {
    switch (windowsInstallerStore) {
      case (?s) {
        ?{
          fileName = s.fileName;
          mimeType = s.mimeType;
          totalSize = s.totalSize;
          chunkCount = s.chunks.size();
        };
      };
      case null {
        switch (windowsInstallerFile) {
          case null { null };
          case (?f) {
            ?{
              fileName = f.fileName;
              mimeType = f.mimeType;
              totalSize = f.file.size();
              chunkCount = 1;
            };
          };
        };
      };
    };
  };

  public query func downloadWindowsInstallerChunk(chunkIndex : Nat) : async InstallerChunkResult {
    switch (windowsInstallerStore) {
      case (?s) {
        if (chunkIndex >= s.chunks.size()) {
          return #err("chunkIndex out of range");
        };
        #ok({
          chunk = s.chunks[chunkIndex];
          chunkIndex;
          chunkCount = s.chunks.size();
        });
      };
      case null {
        switch (windowsInstallerFile) {
          case null {
            #err("Windows installer not available. Please contact support.");
          };
          case (?f) {
            if (chunkIndex != 0) { return #err("chunkIndex out of range") };
            #ok({
              chunk = f.file;
              chunkIndex = 0;
              chunkCount = 1;
            });
          };
        };
      };
    };
  };

  // Manual license sending (admin-only) — networked v2 grace license + entitlement registry.
  public shared ({ caller }) func sendManualLicense(recipientName : Text, recipientEmail : Text, selectedFeatures : [Text]) : async EmailSendResult {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can send manual licenses");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #licenseGenerator) };
    if (not privateKeyConfigured()) {
      return #err("RSA private key is not configured. Upload private.pem via uploadPrivateKeyPem.");
    };
    if (selectedFeatures.size() == 0) {
      return #err("Select at least one feature.");
    };

    let nowNs = Time.now();
    let entitlement = upsertEntitlementFromPurchase(
      recipientEmail,
      selectedFeatures,
      nowNs,
      null,
    );
    appendEntitlementWorkflowLog(
      entitlement.entitlementId,
      "admin_manual_send",
      "Admin sendManualLicense issued v2 grace license for " # recipientName,
      null,
    );
    let licenseJson = switch (buildSignedEntitlementLicense(entitlement, nowNs)) {
      case null { return #err("License signing failed.") };
      case (?signed) signed;
    };

    recordLicenseInternal(
      licenseJson,
      recipientEmail,
      entitlement.features,
      entitlement.activationDeadlineNs,
      "manual_send_v2",
    );

    let subject = "Your BAMM premium license — activate within 30 days";
    let body =
      "Dear " # recipientName # ",\n\n"
      # "Your signed license file is attached. Open BAMM, tap the Premium chip in the top bar, and finish setup in Manage → Server Settings.\n"
      # "You have 30 days of Premium while you connect — your full year starts when you activate on this computer.\n\n"
      # "Your financial records stay on your device. Trades and Tx Simulator are planning tools only—not investment or tax advice.\n\n"
      # "Questions? support@bammservice.com\n— BAMM SERVICES INC.";

    let emailResult = await sendLicenseEmailWithResend(recipientEmail, licenseJson, subject, body);

    switch (emailResult) {
      case (#ok(_)) {
        appendEntitlementWorkflowLog(
          entitlement.entitlementId,
          "license_emailed",
          "Admin sendManualLicense emailed v2 grace license",
          null,
        );
        #ok("v2 license sent to " # recipientEmail # " (entitlement " # entitlement.entitlementId # ")");
      };
      case (#err(error)) {
        #err("Failed to send license: " # error);
      };
    };
  };

  // Update features on a purchase record
  public shared ({ caller }) func updatePurchaseFeatures(transactionId : Text, features : [Text]) : async {
    #ok;
    #err : Text;
  } {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can update purchase features");
    };

    switch (premiumPurchases.get(transactionId)) {
      case null {
        return #err("Purchase record not found for transactionId: " # transactionId);
      };
      case (?purchase) {
        // Update the purchase record with new features
        let updated : PremiumPurchase = { purchase with features };
        premiumPurchases.add(transactionId, updated);
        #ok;
      };
    };
  };


  // Resend a purchase license email — looks up existing paid_sent license record
  public shared ({ caller }) func resendPurchaseLicense(transactionId : Text, recipientEmail : Text) : async {
    #ok : Text;
    #err : Text;
  } {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can resend purchase licenses");
    };

    switch (premiumPurchases.get(transactionId)) {
      case null {
        return #err("Purchase record not found for transactionId: " # transactionId);
      };
      case (?purchase) {
        let emailTarget = if (recipientEmail == "") { purchase.email } else { recipientEmail };

        // Find the most recent paid_sent license record for this email
        var latestLicenseJson : ?Text = null;
        var latestTimestamp : Int = 0;
        for ((_key, record) in licenseRecords.entries()) {
          if (
            record.recipientEmail == purchase.email and
            record.deliveryStatus == "paid_sent" and
            record.generatedTimestamp > latestTimestamp
          ) {
            latestLicenseJson := ?record.licenseJson;
            latestTimestamp := record.generatedTimestamp;
          };
        };

        switch (latestLicenseJson) {
          case null {
            #err("No paid license found for this purchase. Please generate a paid license first.");
          };
          case (?licenseJson) {
            let emailResult = await sendLicenseEmailWithResend(
              emailTarget,
              licenseJson,
              "Your BAMM annual premium license (resend)",
              "Your BAMM premium license is attached. Transaction ID: " # transactionId,
            );
            switch (emailResult) {
              case (#ok(msg)) #ok(msg);
              case (#err(e)) #err(e);
            };
          };
        };
      };
    };
  };

  // ── Networked entitlement activation (Phase 1) ─────────────────────────────

  public query func getEntitlementStatus(entitlementId : Text, activationNonce : Text) : async {
    #ok : EntitlementStatusView;
    #err : Text;
  } {
    switch (getEntitlementById(entitlementId)) {
      case null { #err("Entitlement not found") };
      case (?entitlement) {
        if (entitlement.activationNonce != activationNonce) {
          return #err("Invalid activation credentials");
        };
        #ok(entitlementToStatusView(entitlement));
      };
    };
  };

  public query ({ caller }) func getCustomerEntitlements(customerEmail : Text) : async [EntitlementStatusView] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view customer entitlements");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    let emailKey = normalizeEmail(customerEmail);
    switch (entitlementsByEmail.get(emailKey)) {
      case null { [] };
      case (?entitlement) { [entitlementToStatusView(refreshEntitlementLifecycle(entitlement, Time.now()))] };
    };
  };

  public query ({ caller }) func getEntitlementRegistry() : async [EntitlementRegistryEntry] {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can view entitlement registry");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    let nowNs = Time.now();
    entitlementsByEmail.entries().map(
      func((_emailKey, rawEntitlement) : (Text, CustomerEntitlement)) : EntitlementRegistryEntry {
        let refreshed = refreshEntitlementLifecycle(rawEntitlement, nowNs);
        let linked = linkedPurchasesForEntitlement(refreshed.email, refreshed.entitlementId);
        let steps = switch (entitlementWorkflowLogs.get(refreshed.entitlementId)) {
          case (?s) { s };
          case null { [] };
        };
        {
          entitlement = entitlementToStatusView(refreshed);
          purchasedAtIso = nowNsToIso(refreshed.purchasedAtNs);
          updatedAtIso = nowNsToIso(refreshed.updatedAtNs);
          linkedPurchases = linked;
          workflowSteps = steps;
        };
      },
    ).toArray();
  };

  /// One-time admin backfill: create CustomerEntitlement rows from historical premiumPurchases.
  /// Stable upgrade only blanked PremiumPurchase.entitlementId (DDR-016); it never populated
  /// entitlementsByEmail. Eligible purchase.status: paid_sent / paid / complete / confirmed
  /// (fulfillment writes "confirmed" before email; many live rows stay there). Also accept
  /// paymentConfirmation == "paid" when status is ambiguous. Skips rows that already have a
  /// non-empty entitlementId. Fresh activation window starts at backfill time so old purchase
  /// timestamps do not instantly forfeit. Does not re-email licenses.
  public shared ({ caller }) func backfillEntitlementsFromPurchases() : async {
    #ok : {
      created : Nat;
      linked : Nat;
      skippedAlreadyLinked : Nat;
      skippedNoFeatures : Nat;
      skippedIneligibleStatus : Nat;
      registrySize : Nat;
    };
    #err : Text;
  } {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can backfill entitlements");
    };
    maybeBootstrapSuperAdmin();
    let callerRecord = requireAdminRole(caller, #administrator);
    let nowNs = Time.now();

    var created = 0 : Nat;
    var linked = 0 : Nat;
    var skippedAlreadyLinked = 0 : Nat;
    var skippedNoFeatures = 0 : Nat;
    var skippedIneligibleStatus = 0 : Nat;

    let purchases = premiumPurchases.entries().toArray();
    let sorted = purchases.sort(
      func(a : (Text, PremiumPurchase), b : (Text, PremiumPurchase)) : {
        #less;
        #equal;
        #greater;
      } {
        Int.compare(a.1.timestamp, b.1.timestamp);
      },
    );

    for ((storageKey, purchase) in sorted.vals()) {
      let statusLower = purchase.status.toLower();
      let paymentLower = purchase.paymentConfirmation.toLower();
      let eligibleStatus =
        statusLower == "paid_sent"
        or statusLower == "paid"
        or statusLower == "complete"
        or statusLower == "confirmed"
        or paymentLower == "paid";
      if (not eligibleStatus) {
        skippedIneligibleStatus += 1;
      } else if (purchase.features.size() == 0) {
        skippedNoFeatures += 1;
      } else if (purchase.entitlementId.size() > 0) {
        skippedAlreadyLinked += 1;
      } else {
        let emailKey = normalizeEmail(purchase.email);
        let hadPrior = switch (entitlementsByEmail.get(emailKey)) {
          case null { false };
          case (?_) { true };
        };
        let sessionOpt : ?Text = if (purchase.stripeSessionId.size() > 0) {
          ?purchase.stripeSessionId;
        } else {
          null;
        };
        let entitlement = upsertEntitlementFromPurchase(
          purchase.email,
          purchase.features,
          nowNs,
          sessionOpt,
        );
        if (hadPrior) {
          linked += 1;
        } else {
          created += 1;
        };
        appendEntitlementWorkflowLog(
          entitlement.entitlementId,
          "purchase_backfilled",
          "Linked historical purchase " # storageKey # " (status=" # purchase.status # ")",
          sessionOpt,
        );
        premiumPurchases.add(
          storageKey,
          { purchase with entitlementId = entitlement.entitlementId },
        );
      };
    };

    appendAuditLog(
      callerRecord.email,
      roleToText(callerRecord.role),
      "backfill_entitlements",
      "created=" # created.toText()
      # ";linked=" # linked.toText()
      # ";skippedLinked=" # skippedAlreadyLinked.toText()
      # ";skippedNoFeatures=" # skippedNoFeatures.toText()
      # ";skippedStatus=" # skippedIneligibleStatus.toText(),
    );

    #ok({
      created;
      linked;
      skippedAlreadyLinked;
      skippedNoFeatures;
      skippedIneligibleStatus;
      registrySize = entitlementsByEmail.size();
    });
  };

  public query func getLicensingPolicy() : async {
    activationWindowDays : Int;
    licenseTermDays : Int;
    machineBindingAlgorithm : Text;
  } {
    {
      activationWindowDays = activationWindowDays;
      licenseTermDays = licenseTermDays;
      machineBindingAlgorithm = "bamm-v1";
    };
  };

  /// Admin support: clear machine binding and return entitlement to pending_activation
  /// with a fresh activation window + nonce (so the customer can re-activate on a device).
  /// Does not delete the registry row or linked purchases. One row remains per email.
  public shared ({ caller }) func resetEntitlementActivation(entitlementId : Text) : async {
    #ok : EntitlementStatusView;
    #err : Text;
  } {
    if (not (isAdmin(caller))) {
      return #err("Unauthorized: Only admins can reset entitlement activation");
    };
    maybeBootstrapSuperAdmin();
    ignore requireAdminRole(caller, #administrator);
    let nowNs = Time.now();
    switch (getEntitlementById(entitlementId)) {
      case null { return #err("Entitlement not found") };
      case (?entitlement) {
        let reset : CustomerEntitlement = {
          entitlement with
          status = #pending_activation;
          activatedAtNs = null;
          expiresAtNs = null;
          machineBindingDigest = null;
          activationDeadlineNs = nowNs + activationWindowDays * nsPerDay;
          activationNonce = newActivationNonce(entitlement.email, nowNs);
          updatedAtNs = nowNs;
        };
        persistEntitlement(reset);
        appendEntitlementWorkflowLog(
          reset.entitlementId,
          "entitlement_activation_reset",
          "Admin cleared machine binding; new activation window started",
          null,
        );
        appendAuditLog(
          caller.toText(),
          "entitlement",
          "reset_entitlement_activation",
          reset.entitlementId # "@" # reset.email,
        );
        #ok(entitlementToStatusView(reset));
      };
    };
  };

  public func activateEntitlement(request : ActivateEntitlementRequest) : async {
    #ok : Text;
    #err : Text;
  } {
    if (not privateKeyConfigured()) {
      return #err("License signing is temporarily unavailable. Please contact support@bammservice.com.");
    };

    let nowNs = Time.now();
    switch (getEntitlementById(request.entitlementId)) {
      case null { return #err("Entitlement not found") };
      case (?entitlement) {
        if (entitlement.activationNonce != request.activationNonce) {
          return #err("Invalid activation credentials");
        };
        if (request.machineDigest.size() == 0 or not request.machineDigest.startsWith(#text "sha256:")) {
          return #err("Invalid machine digest format");
        };

        let current = refreshEntitlementLifecycle(entitlement, nowNs);
        switch (current.status) {
          case (#forfeited) { return #err("Entitlement forfeited — activation window expired") };
          case (#expired) { return #err("Entitlement expired") };
          case (#activated) {
            switch (current.machineBindingDigest) {
              case null { return #err("Entitlement activation state is invalid") };
              case (?boundDigest) {
                if (boundDigest != request.machineDigest) {
                  return #err("This premium license is already active on another computer");
                };
                switch (buildSignedEntitlementLicense(current, nowNs)) {
                  case null { return #err("License signing failed") };
                  case (?signed) {
                    recordLicenseInternal(
                      signed,
                      current.email,
                      current.features,
                      switch (current.expiresAtNs) { case null nowNs; case (?e) e },
                      "activation_refresh",
                    );
                    return #ok(signed);
                  };
                };
              };
            };
          };
          case (#pending_activation) {
            if (nowNs > current.activationDeadlineNs) {
              let forfeited = { current with status = #forfeited; updatedAtNs = nowNs };
              persistEntitlement(forfeited);
              return #err("Activation window expired");
            };
            let expiresAtNs = nowNs + licenseTermDays * nsPerDay;
            let activated : CustomerEntitlement = {
              current with
              status = #activated;
              activatedAtNs = ?nowNs;
              expiresAtNs = ?expiresAtNs;
              machineBindingDigest = ?request.machineDigest;
              updatedAtNs = nowNs;
            };
            persistEntitlement(activated);
            appendAuditLog(
              "system",
              "entitlement",
              "activate_entitlement",
              activated.entitlementId # "@" # activated.email,
            );
            appendEntitlementWorkflowLog(
              activated.entitlementId,
              "entitlement_activated",
              "Machine binding applied; license term started",
              null,
            );
            switch (buildSignedEntitlementLicense(activated, nowNs)) {
              case null { return #err("License signing failed") };
              case (?signed) {
                recordLicenseInternal(signed, activated.email, activated.features, expiresAtNs, "activated");
                return #ok(signed);
              };
            };
          };
        };
      };
    };
  };

  // ── Paid License Generation & Delivery ──────────────────────────────────────

  // fulfillPaidLicense: server-side paid license workflow (P0.1 / SEC-001).
  // Verifies Stripe session, signs license on-canister, emails via RESEND.
  public func fulfillPaidLicense(sessionId : Text) : async {
    #ok : Text;
    #err : Text;
  } {
    if (not privateKeyConfigured()) {
      return #err("License signing is temporarily unavailable. Please contact support@bammservice.com.");
    };

    let sessionResult = await getStripeSessionStatus(sessionId);
    switch (sessionResult) {
      case (#err(e)) { return #err(e) };
      case (#ok(details)) {
        if (details.status != "paid" and details.status != "complete") {
          return #err("Payment not confirmed yet. Please wait and retry.");
        };
        if (details.features.size() == 0) {
          return #err("No features found for this purchase.");
        };

        let nowNs = Time.now();
        let entitlement = upsertEntitlementFromPurchase(details.customerEmail, details.features, nowNs, ?sessionId);
        appendEntitlementWorkflowLog(
          entitlement.entitlementId,
          "purchase_fulfilled",
          "Stripe session fulfilled and license signing started",
          ?sessionId,
        );
        let signedLicenseJson = switch (buildSignedEntitlementLicense(entitlement, nowNs)) {
          case null { return #err("License signing failed. Contact support.") };
          case (?signed) signed;
        };

        let amountFloat = Float.fromInt(Int.abs(details.amountTotal)) / 100.0;
        return await generateAndSendPaidLicense(
          sessionId,
          signedLicenseJson,
          details.customerEmail,
          details.customerName,
          details.features,
          amountFloat,
        );
      };
    };
  };

  // generateAndSendPaidLicense: emails a server-signed license and records the purchase.
  // Idempotency: if a paid_sent record already exists for this session, returns #ok.
  public func generateAndSendPaidLicense(sessionId : Text, signedLicenseJson : Text, customerEmail : Text, customerName : Text, features : [Text], amountTotal : Float) : async {
    #ok : Text;
    #err : Text;
  } {
    // Idempotency: check if this exact session already has a license_sent pipeline step
    switch (transactionLogs.get(sessionId)) {
      case (?tl) {
        for (ps in tl.pipelineSteps.vals()) {
          if (ps.step == "license_sent") {
            await logEmailInternal("paid_license_idempotency", "Idempotency guard: session " # sessionId # " already has license_sent — skipping duplicate", "info", null);
            return #ok("License already sent to " # customerEmail # " for session " # sessionId);
          };
        };
      };
      case null {};
    };
    // Also check legacy paid_sent status
    switch (premiumPurchases.get(sessionId)) {
      case (?existing) {
        if (existing.status == "paid_sent") {
          await logEmailInternal("paid_license_idempotency", "Idempotency guard fired: session " # sessionId # " already has status paid_sent — skipping duplicate send", "info", null);
          return #ok("License already sent to " # customerEmail # " for session " # sessionId);
        };
        // status != "paid_sent": purchase exists but email not yet confirmed sent — allow retry
      };
      case null {};
    };

    if (features.size() == 0) {
      return #err("No features specified for paid license. Cannot generate an empty license.");
    };

    if (signedLicenseJson == "" or signedLicenseJson.contains(#text "pending_frontend_signature") or signedLicenseJson.contains(#text "unsigned")) {
      return #err("Unsigned or client-side license signing is not supported. Use fulfillPaidLicense.");
    };

    // Validate customerEmail — guard against "unknown@unknown", "unknown@customer.com",
    // empty strings, or values missing "@" and "." (not a valid email format).
    // If invalid, log a warning; we still proceed so the purchase is recorded, but the
    // admin will see the warning in logs.
    let isValidEmail = customerEmail.size() > 0
      and customerEmail.contains(#char '@')
      and customerEmail.contains(#char '.')
      and not customerEmail.startsWith(#text "unknown")
      and customerEmail != "unknown@customer.com"
      and customerEmail != "unknown@unknown";
    if (not isValidEmail) {
      await logEmailInternal(
        "paid_license_warning",
        "generateAndSendPaidLicense called with invalid/unknown email '" # customerEmail # "' for session " # sessionId # ". Check Stripe session customer_details.email.",
        "warning",
        null
      );
    };

    // Derive BAMM transaction ID: last 4 chars of sessionId
    let txId = last4Chars(sessionId);

    let linkedEntitlementId = switch (entitlementsByEmail.get(normalizeEmail(customerEmail))) {
      case (?entitlement) { entitlement.entitlementId };
      case null { "" };
    };

    // Convert amountTotal Float (in dollars, e.g. 0.50) to Nat in cents (e.g. 50)
    // Multiply by 100 once to get cents — do NOT divide again
    let amountNat : Nat = if (amountTotal > 0.0) {
      let cents = amountTotal * 100.0;
      if (cents >= 0.0) { Int.abs((cents + 0.5).toInt()) } else { 0 };
    } else { 0 };

    // Build email subject and body
    let subject = "Your BAMM annual premium license (Transaction: " # txId # ")";
    let featuresText = "[" # features.map(func(f) { f }).values().join(", ") # "]";
    let body = "Dear " # customerName # ",\n\n" #
      "Thank you for your BAMM premium purchase.\n" #
      "Transaction ID: " # txId # "\n" #
      "Features purchased: " # featuresText # "\n\n" #
      "Your signed license file is attached. Open BAMM, tap the Premium chip in the top bar, and finish setup in Manage → Server Settings.\n" #
      "You have 30 days of Premium while you connect — your full year starts when you activate on this computer.\n\n" #
      "Your financial records stay on your device. Trades and Tx Simulator are planning tools only—not investment or tax advice.\n\n" #
      "Questions? support@bammservice.com\n— BAMM SERVICES INC.";

    // Record/update the PremiumPurchase — start as 'confirmed' before email send
    switch (premiumPurchases.get(sessionId)) {
      case null {
        recordPremiumPurchaseInternal(
          customerEmail, txId, amountNat, "confirmed",
          customerName, sessionId, "paid", features, linkedEntitlementId
        );
      };
      case (?existing) {
        let updated : PremiumPurchase = {
          existing with
          customerName;
          email = customerEmail;
          amount = amountNat;
          stripeSessionId = sessionId;
          paymentConfirmation = "paid";
          features;
          status = "confirmed";
          entitlementId = linkedEntitlementId;
        };
        premiumPurchases.add(sessionId, updated);
      };
    };

    if (linkedEntitlementId.size() > 0) {
      addPipelineStep(
        sessionId,
        "entitlement_linked",
        "Entitlement " # linkedEntitlementId # " linked to purchase " # txId,
      );
    };

    // Send the pre-signed license via RESEND as BAMM-License.json
    let emailResult = await sendLicenseEmailWithResendFilename(
      customerEmail,
      signedLicenseJson,
      subject,
      body,
      "BAMM-License.json"
    );

    switch (emailResult) {
      case (#err(e)) {
        // Update status to paid_failed
        switch (premiumPurchases.get(sessionId)) {
          case null {};
          case (?existing) {
            premiumPurchases.add(sessionId, { existing with status = "paid_failed" });
          };
        };
        upsertTransactionLog(sessionId, func(tl) { { tl with licenseStatus = "failed" } });
        addPipelineStep(sessionId, "license_failed", "License email delivery failed: " # e);
        await logEmailInternal(customerEmail, subject, "failed", ?e);
        return #err("License email delivery failed: " # e);
      };
      case (#ok(_)) {};
    };

    // Record the license — only after successful send
    let nowNs : Int = Time.now();
    let expiryNs = switch (entitlementsByEmail.get(normalizeEmail(customerEmail))) {
      case null { nowNs + licenseTermDays * nsPerDay };
      case (?entitlement) {
        switch (entitlement.expiresAtNs) {
          case null { entitlement.activationDeadlineNs };
          case (?expiresAt) { expiresAt };
        };
      };
    };
    recordLicenseInternal(signedLicenseJson, customerEmail, features, expiryNs, "paid_sent");

    // Update purchase status to paid_sent
    switch (premiumPurchases.get(sessionId)) {
      case null {};
      case (?existing) {
        premiumPurchases.add(sessionId, { existing with status = "paid_sent" });
      };
    };

    // Ensure user is in Submissions list for admin tracking with Licensed status marker
    // We embed the paid/licensed indicator in the name field as a suffix since UserSubmission
    // has no dedicated status field. Admins see this in the Submissions panel.
    let paidSubmissionName = customerName # " [Licensed]";
    switch (userSubmissions.get(customerEmail)) {
      case null {
        userSubmissions.add(customerEmail, { name = paidSubmissionName; email = customerEmail; timestamp = Time.now(); downloadCount = 0 });
        addPipelineStep(sessionId, "submission_added", "Added paid user " # customerEmail # " to submissions with Licensed status");
      };
      case (?existing) {
        // Update existing submission to show Licensed status
        userSubmissions.add(customerEmail, { existing with name = paidSubmissionName });
        addPipelineStep(sessionId, "submission_updated", "Updated existing submission for " # customerEmail # " to Licensed status");
      };
    };

    // Update TransactionLog with license_sent status and record the real EmailLog entry
    upsertTransactionLog(sessionId, func(tl) {
      { tl with licenseStatus = "sent"; transactionId = txId }
    });
    addPipelineStep(sessionId, "license_sent", "License emailed to " # customerEmail);
    if (linkedEntitlementId.size() > 0) {
      appendEntitlementWorkflowLog(
        linkedEntitlementId,
        "license_emailed",
        "Signed license emailed for transaction " # txId,
        ?sessionId,
      );
    };
    switch (sessionOwners.get(sessionId)) {
      case (?caller) { pruneSupersededCheckoutLogs(sessionId, ?caller, customerEmail) };
      case null { pruneSupersededCheckoutLogs(sessionId, null, customerEmail) };
    };
    // Keep the real email delivery record in EmailLogs for backward compatibility
    await logEmailInternal(customerEmail, subject, "paid_sent", null);
    #ok("License sent successfully to " # customerEmail # " (Transaction: " # txId # ")");
  };

  // Delete a single premium purchase record by transactionId (admin-only)
  public shared ({ caller }) func deletePremiumPurchase(transactionId : Text) : async Result.Result<(), Text> {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete purchase records");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    switch (premiumPurchases.get(transactionId)) {
      case null {
        return #err("Purchase record not found for transactionId: " # transactionId);
      };
      case (?_) {
        premiumPurchases.remove(transactionId);
        await logEmailInternal("admin_action", "Deleted purchase record: " # transactionId, "info", null);
        #ok(());
      };
    };
  };

  // Delete multiple premium purchase records by transactionIds (admin-only)
  public shared ({ caller }) func deletePremiumPurchases(transactionIds : [Text]) : async Result.Result<Nat, Text> {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can delete purchase records");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    var deletedCount = 0;
    for (txId in transactionIds.vals()) {
      switch (premiumPurchases.get(txId)) {
        case null {};
        case (?_) {
          premiumPurchases.remove(txId);
          deletedCount += 1;
        };
      };
    };
    await logEmailInternal("admin_action", "Bulk deleted " # deletedCount.toText() # " purchase records", "info", null);
    #ok(deletedCount);
  };

  // sendSignedPaidLicense: receives the RSA-signed license JSON from the frontend and emails it.
  // Records the license and updates the PremiumPurchase status.
  public func sendSignedPaidLicense(sessionId : Text, signedLicenseJson : Text, customerEmail : Text, features : [Text]) : async {
    #ok : Text;
    #err : Text;
  } {
    // Idempotency: if already sent for this session, return ok
    for ((_key, record) in licenseRecords.entries()) {
      if (
        record.recipientEmail == customerEmail and
        record.deliveryStatus == "paid_sent"
      ) {
        return #ok("License already sent");
      };
    };

    let subject = "Your BAMM annual premium license";
    let body = "Thank you for your BAMM premium purchase. " #
      "Your signed license file is attached. " #
      "Open BAMM, go to License Settings, and import the attached file to activate your features.\n\n" #
      "Your financial records stay on your device.";

    let emailResult = await sendLicenseEmailWithResendFilename(
      customerEmail,
      signedLicenseJson,
      subject,
      body,
      "BAMM-License.json"
    );

    switch (emailResult) {
      case (#err(e)) {
        return #err("Failed to send paid license: " # e);
      };
      case (#ok(_)) {};
    };

    // Record the license
    let expiryDate = Time.now() + 365 * 24 * 60 * 60 * 1_000_000_000;
    recordLicenseInternal(signedLicenseJson, customerEmail, features, expiryDate, "paid_sent");

    // Update the PremiumPurchase record status
    switch (premiumPurchases.get(sessionId)) {
      case null {};
      case (?existing) {
        let updated : PremiumPurchase = {
          existing with
          status = "paid_sent";
          paymentConfirmation = "paid";
          features;
        };
        premiumPurchases.add(sessionId, updated);
      };
    };

    #ok("License sent successfully to " # customerEmail);
  };

  // Helper: convert epoch seconds to YYYY-MM-DD string
  func epochSecondsToDate(sec : Int) : Text {
    let days = sec / 86400;
    var z = days + 719468;
    var era = (if (z >= 0) z else z - 146096) / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + (if (mp < 10) 3 else -9);
    let yr = y + (if (m <= 2) 1 else 0);
    let pad2 = func(n : Int) : Text {
      if (n < 10) { "0" # n.toText() } else { n.toText() };
    };
    yr.toText() # "-" # pad2(m) # "-" # pad2(d);
  };

  // Helper: convert epoch seconds to ISO 8601 UTC timestamp string
  func epochSecondsToIso(sec : Int) : Text {
    let days = sec / 86400;
    let timeOfDay = sec - days * 86400;
    let hh = timeOfDay / 3600;
    let mm = (timeOfDay - hh * 3600) / 60;
    let ss = timeOfDay - hh * 3600 - mm * 60;
    let datePart = epochSecondsToDate(sec);
    let pad2 = func(n : Int) : Text {
      if (n < 10) { "0" # n.toText() } else { n.toText() };
    };
    datePart # "T" # pad2(hh) # ":" # pad2(mm) # ":" # pad2(ss) # "Z";
  };

  // Migrate feature names in licenseFeatures storage to correct naming convention.
  // Renames wrong legacy names, removes fake entries, and ensures Trades and
  // Migration Management exist. Called on postupgrade and available as admin API.
  func migrateFeatureNamesInternal() : Text {
    var log = "";

    // Rename mapping: (oldName, ?newName)  — null means delete
    let renames : [(Text, ?Text)] = [
      ("Tax Simulator",  ?"Tx Simulator"),
      ("Bill Files",     null),
      ("Dashboard",      null),
      ("Data Management",?"Database Management"),
      ("Goals Tracker",  ?"Goals"),
      ("TxSimulator",    ?"Tx Simulator"),
    ];

    // Collect current entries so we can iterate safely
    let allEntries = licenseFeatures.entries().toArray();

    for ((featureId, feature) in allEntries.vals()) {
      for ((oldName, maybeNewName) in renames.vals()) {
        if (feature.name == oldName) {
          switch (maybeNewName) {
            case null {
              // Keep intentional core/free marketing records used for homepage Learn More images.
              if (
                featureId == "dashboard" or
                featureId == "bill_files" or
                featureId == "income_tracking"
              ) {
                // skip
              } else {
                licenseFeatures.remove(featureId);
                log #= "Removed: " # oldName # "; ";
              };
            };
            case (?newName) {
              let updated : LicenseFeature = {
                feature with
                name = newName;
                licenseReferenceName = if (feature.licenseReferenceName != "") { feature.licenseReferenceName } else { newName };
              };
              licenseFeatures.add(featureId, updated);
              log #= "Renamed: " # oldName # " -> " # newName # "; ";
            };
          };
        };
      };
    };

    // Ensure all premium features have a licenseReferenceName populated (back-fill from name).
    // Core/free marketing features may keep an empty reference so they stay out of license name matching.
    for ((featureId, feature) in licenseFeatures.entries().toArray().vals()) {
      if (feature.isPremium and feature.licenseReferenceName == "") {
        licenseFeatures.add(featureId, { feature with licenseReferenceName = feature.name });
        log #= "BackfilledRef: " # feature.name # "; ";
      };
    };

    // Ensure Trades exists
    var tradesFound = false;
    for ((_id, f) in licenseFeatures.entries()) {
      if (f.name == "Trades") { tradesFound := true };
    };
    if (not tradesFound) {
      let tradesFeature : LicenseFeature = {
        id           = "trades";
        name         = "Trades";
        description  = "Scan, backtest, and trade with risk controls you define. Strategy tools only—not investment advice.";
        isPremium    = true;
        isActive     = true;
        priceInCents = 4999;
        image        = null;
        featureType  = "premium";
        licenseReferenceName = "Trades";
      };
      licenseFeatures.add("trades", tradesFeature);
      log #= "Added: Trades; ";
    };

    // Ensure Database Management exists
    var migrationFound = false;
    for ((_id, f) in licenseFeatures.entries()) {
      if (f.id == "migration-management" or f.name == "Database Management" or f.name == "Migration Management") { migrationFound := true };
    };
    if (not migrationFound) {
      let migrationFeature : LicenseFeature = {
        id           = "migration-management";
        name         = "Database Management";
        description  = "Export, backup, and maintain your local financial data.";
        isPremium    = true;
        isActive     = true;
        priceInCents = 999;
        image        = null;
        featureType  = "premium";
        licenseReferenceName = "Database Management";
      };
      licenseFeatures.add("migration-management", migrationFeature);
      log #= "Added: Database Management; ";
    };

    if (log == "") { "No changes needed." } else { log };
  };

  // Public admin endpoint to trigger feature name migration on demand
  public shared ({ caller }) func migrateFeatureNames() : async Text {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can run feature migration");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #administrator) };
    migrateFeatureNamesInternal();
  };

  // Note: migrateFeatureNamesInternal() is available as admin endpoint
  // and was run during prior upgrades. The postupgrade hook has been removed
  // because enhanced orthogonal persistence does not use preupgrade/postupgrade.

  // Upload feature image (admin-only)
  public shared ({ caller }) func uploadFeatureImage(featureId : Text, image : Blob) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can upload feature images");
    };
    if (adminBootstrapped) { ignore requireAdminRole(caller, #featuresManager) };
    switch (licenseFeatures.get(featureId)) {
      case null { Runtime.trap("Feature not found") };
      case (?feature) {
        licenseFeatures.add(featureId, { feature with image = ?image });
      };
    };
  };

  // Remove feature image (admin-only)
  public shared ({ caller }) func removeFeatureImage(featureId : Text) : async () {
    if (not (isAdmin(caller))) {
      Runtime.trap("Unauthorized: Only admins can remove feature images");
    };
    switch (licenseFeatures.get(featureId)) {
      case null { Runtime.trap("Feature not found") };
      case (?feature) {
        licenseFeatures.add(featureId, { feature with image = null });
      };
    };
  };
  // Configuration status — indicates whether critical keys are present
  // Returns green/red indicators for the admin panel without exposing key values
  public query func getConfigurationStatus() : async {
    stripeConfigured : Bool;
    resendConfigured : Bool;
    privateKeyPresent : Bool;
  } {
    {
      stripeConfigured = switch (stripeConfig) {
        case (?c) { c.secretKey != "" };
        case null { false };
      };
      resendConfigured = switch (resendConfig) {
        case (?c) { c.apiKey != "" };
        case null { false };
      };
      privateKeyPresent = privateKeyConfigured();
    };
  };
};


