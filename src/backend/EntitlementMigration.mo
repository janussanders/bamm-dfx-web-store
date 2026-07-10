import Map "mo:core/Map";

/// Stable-upgrade bridge: production premiumPurchases predates entitlementId (PR #26).
/// check-stable baseline: scripts/check-stable/backend-02c10d9.most (DDR-017).
module {
  public type PremiumPurchaseLegacy = {
    email : Text;
    transactionId : Text;
    amount : Nat;
    timestamp : Int;
    status : Text;
    customerName : Text;
    stripeSessionId : Text;
    paymentConfirmation : Text;
    features : [Text];
  };

  public type PremiumPurchase = {
    email : Text;
    transactionId : Text;
    amount : Nat;
    timestamp : Int;
    status : Text;
    customerName : Text;
    stripeSessionId : Text;
    paymentConfirmation : Text;
    features : [Text];
    entitlementId : Text;
  };

  public func migration(state : {
    premiumPurchases : Map.Map<Text, PremiumPurchaseLegacy>;
  }) : {
    premiumPurchases : Map.Map<Text, PremiumPurchase>;
  } {
    let migrated = Map.empty<Text, PremiumPurchase>();
    for ((key, purchase) in state.premiumPurchases.entries()) {
      migrated.add(
        key,
        {
          purchase with
          entitlementId = "";
        },
      );
    };
    { premiumPurchases = migrated };
  };
};
