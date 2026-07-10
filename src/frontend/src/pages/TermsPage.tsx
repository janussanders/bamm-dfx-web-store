import LegalDocumentPage from "@/components/LegalDocumentPage";
import { TERMS_SECTIONS } from "@/legal/copy";

export default function TermsPage() {
  return (
    <LegalDocumentPage title="Terms of Service" sections={TERMS_SECTIONS} />
  );
}
