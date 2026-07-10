import LegalDocumentPage from "@/components/LegalDocumentPage";
import { PRIVACY_SECTIONS } from "@/legal/copy";

export default function PrivacyPage() {
  return (
    <LegalDocumentPage title="Privacy Policy" sections={PRIVACY_SECTIONS} />
  );
}
