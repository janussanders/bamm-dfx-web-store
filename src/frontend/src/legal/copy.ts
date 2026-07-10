/** Shared legal copy — engineering draft; requires counsel review before marketing scale. */

export const LEGAL_ENTITY = "BAMM SERVICES INC.";
export const PRODUCT_NAME = "BAMM";
export const SUPPORT_EMAIL = "support@bammservice.com";
export const EFFECTIVE_DATE = "July 8, 2026";
export const GOVERNING_LAW_STATE = "Washington";

export type LegalSection = { heading: string; paragraphs: string[] };

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Agreement",
    paragraphs: [
      `These Terms of Service ("Terms") govern your use of the ${PRODUCT_NAME} storefront at bamm-gw3.caffeine.xyz and related download, checkout, and license delivery services operated by ${LEGAL_ENTITY} ("BAMM", "we", "us", "our").`,
      "By downloading software, requesting a trial license, or completing a purchase, you agree to these Terms, our Privacy Policy, and our Refund Policy.",
    ],
  },
  {
    heading: "2. Eligibility",
    paragraphs: [
      "You must be at least 18 years old and able to form a binding contract to use our services.",
    ],
  },
  {
    heading: "3. Licenses and purchases",
    paragraphs: [
      `${PRODUCT_NAME} desktop software is licensed, not sold. Free trials and paid premium features are delivered as signed license files. Paid networked licenses typically include a limited activation (grace) window, after which the full license term (typically 365 days) begins on successful machine activation unless otherwise stated at checkout.`,
      "Paid licenses grant you the right to use the purchased features for personal or commercial financial management on your own devices, subject to the license file, entitlement registry rules, and the desktop EULA presented at install.",
      "Prices are shown in U.S. dollars. Payment is processed by Stripe. Your card issuer may apply additional fees.",
      "Annual licenses do not auto-renew unless we explicitly offer and you accept a subscription product in the future. You may purchase a new annual license before or after expiry.",
    ],
  },
  {
    heading: "4. Networked entitlements and activation",
    paragraphs: [
      "Paid premium licenses may be issued as networked entitlements. An entitlement is a non-financial license record that tracks purchase email, purchased feature set, entitlement identifier, activation status, activation deadline, and (after activation) a machine-binding digest and expiry. Entitlement records do not include your bills, income, transactions, or other desktop financial records.",
      "You must complete activation on an eligible device within the activation window stated in your license (typically 30 days from issuance). Activation binds the entitlement to that device according to the license and desktop EULA.",
      "If you do not activate within the window, the entitlement may be forfeited or otherwise become unusable. Failure to activate, failure to keep a working device/network path for activation, or other non-compliance with entitlement activation requirements is not a delivery failure by BAMM and does not entitle you to a refund, except where required by law.",
      "You may not circumvent, share, or forge entitlement or license controls. We may suspend or revoke entitlements for fraud, abuse, or material breach.",
    ],
  },
  {
    heading: "5. Regulated-adjacent features",
    paragraphs: [
      "Some premium features (including Trades and Tx Simulator) are tools only. BAMM does not provide investment, tax, or legal advice, and is not a broker-dealer, investment adviser, or tax preparer.",
      "Trading and tax simulation involve risk. You are solely responsible for your financial decisions and for verifying results with qualified professionals.",
    ],
  },
  {
    heading: "6. Acceptable use",
    paragraphs: [
      "You may not misuse the site, attempt to circumvent license or entitlement controls, interfere with security, or use the service for unlawful purposes.",
      "We may suspend access for violations or suspected fraud.",
    ],
  },
  {
    heading: "7. Disclaimer of warranties",
    paragraphs: [
      'Services and software are provided "as is" without warranties of any kind, to the fullest extent permitted by law.',
    ],
  },
  {
    heading: "8. Limitation of liability",
    paragraphs: [
      `To the fullest extent permitted by law, ${LEGAL_ENTITY} is not liable for indirect, incidental, special, or consequential damages, or for loss of data, profits, or trading losses arising from use of the site or software.`,
    ],
  },
  {
    heading: "9. Changes",
    paragraphs: [
      "We may update these Terms. Material changes will be posted on this page with a revised effective date. Continued use after changes constitutes acceptance.",
    ],
  },
  {
    heading: "10. Governing law",
    paragraphs: [
      `These Terms are governed by the laws of the State of ${GOVERNING_LAW_STATE}, United States, without regard to conflict-of-law principles.`,
      `Any dispute arising from these Terms or your use of our services shall be brought in the state or federal courts located in ${GOVERNING_LAW_STATE}, and you consent to their jurisdiction.`,
      `${LEGAL_ENTITY} is registered in the State of ${GOVERNING_LAW_STATE}.`,
    ],
  },
  {
    heading: "11. Contact",
    paragraphs: [`Questions: ${SUPPORT_EMAIL}`],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Overview",
    paragraphs: [
      `This Privacy Policy describes how ${LEGAL_ENTITY} collects and uses information when you use our storefront and license delivery services.`,
      `${PRODUCT_NAME} desktop software is designed so your financial records (bills, income, transactions, and similar personal financial data) stay on your device. This policy explains what the website, checkout, and entitlement registry collect separately from the desktop app.`,
    ],
  },
  {
    heading: "2. Information we collect on this site",
    paragraphs: [
      "Name and email when you request a free trial download or purchase a license.",
      "Payment information is collected and processed by Stripe. We do not store full card numbers on our servers.",
      "Admin and support interactions if you contact us or accept an admin invite.",
      "Technical logs necessary to operate the site (e.g., delivery status, fraud prevention).",
    ],
  },
  {
    heading: "3. Entitlement and license records (non-financial)",
    paragraphs: [
      "For paid networked licenses we maintain an entitlement registry and related license delivery logs. These records typically include: purchase or recipient email, purchased feature names, entitlement identifier, issuance and activation timestamps, activation deadline, entitlement status (for example pending activation, activated, forfeited, or expired), and after activation a machine-binding digest and license expiry.",
      "Entitlement and license records are operational license-control data. They are not your desktop financial records. We do not store your bills, income, transactions, budgets, goals, tax inputs, or trading positions in the entitlement registry.",
      "Machine-binding digests are derived device identifiers used to enforce single-machine (or otherwise limited) activation. They are not a copy of your personal financial files.",
    ],
  },
  {
    heading: "4. How we use information",
    paragraphs: [
      "Deliver license files and installer download links.",
      "Process payments and provide purchase receipts.",
      "Operate entitlement activation, renewal eligibility, fraud prevention, and support.",
      "Respond to support requests and prevent abuse.",
      "Improve site reliability and security.",
    ],
  },
  {
    heading: "5. What we do not collect (desktop app — standard use)",
    paragraphs: [
      "We do not upload your desktop financial records to BAMM servers in the standard local-first configuration.",
      "Future optional BAMM SERVICES programs (such as BETA or subscription tiers) that collect usage telemetry will require separate, versioned consent before any new category of personal or financial data leaves your device.",
    ],
  },
  {
    heading: "6. Service providers",
    paragraphs: [
      "We use trusted processors, including:",
      "• Stripe — payment processing",
      "• RESEND — transactional email delivery",
      "• Internet Computer / Caffeine.ai — application hosting and entitlement registry storage",
      "Processors are authorized only to perform services on our behalf.",
    ],
  },
  {
    heading: "7. Data retention",
    paragraphs: [
      "Checkout, entitlement, and license delivery records are retained as needed for accounting, support, fraud prevention, license enforcement, and legal compliance.",
      "You may request deletion of storefront account or delivery records where applicable by contacting us, subject to records we must keep to evidence purchase fulfillment or prevent fraud.",
    ],
  },
  {
    heading: "8. Your rights",
    paragraphs: [
      "Depending on your location, you may have rights to access, correct, or delete personal information we hold about you.",
      `Submit requests to ${SUPPORT_EMAIL}. We do not sell your personal information.`,
    ],
  },
  {
    heading: "9. Children",
    paragraphs: [
      "Our services are not directed to children under 13, and we do not knowingly collect their information.",
    ],
  },
  {
    heading: "10. Contact",
    paragraphs: [`Privacy inquiries: ${SUPPORT_EMAIL}`],
  },
];

export const REFUND_SECTIONS: LegalSection[] = [
  {
    heading: "1. Digital licenses",
    paragraphs: [
      `${PRODUCT_NAME} premium features are delivered as digital license files and, for networked licenses, corresponding entitlement records. Once a license is successfully delivered to the email you provide, the sale is generally final.`,
    ],
  },
  {
    heading: "2. Refund window",
    paragraphs: [
      `If you experience a technical failure that prevents license delivery (for example, our systems fail to email a signed license after successful payment), contact us within 14 days of purchase at ${SUPPORT_EMAIL}. We will work in good faith to re-issue the license or offer a refund when delivery failed on our side.`,
      "Refunds are not available for change-of-mind after successful license delivery, except where required by law.",
    ],
  },
  {
    heading: "3. Entitlement activation — no refund for non-compliance",
    paragraphs: [
      "Networked licenses require you to complete machine activation within the activation window stated in your license (typically 30 days). Successful email delivery of a signed license constitutes fulfillment of the digital good.",
      "There is no refund if you fail to activate within the window, forfeit the entitlement through non-compliance, lose access because the activation deadline passed, refuse or are unable to complete activation steps, or otherwise do not meet entitlement activation requirements — except where a refund is required by applicable law.",
      "Device changes, OS reinstalls, or lost license files after successful delivery are your responsibility unless we confirm a delivery or signing failure on our side.",
    ],
  },
  {
    heading: "4. Chargebacks",
    paragraphs: [
      "If you dispute a charge with your bank, we may provide Stripe and the card network with delivery and entitlement records (email, license issuance logs, entitlement status, activation deadlines, and these Terms) as evidence of fulfillment.",
    ],
  },
  {
    heading: "5. Contact",
    paragraphs: [`Refund requests: ${SUPPORT_EMAIL}`],
  },
];
