import LegalDocumentPage from "@/components/LegalDocumentPage";
import { REFUND_SECTIONS } from "@/legal/copy";

export default function RefundPage() {
  return <LegalDocumentPage title="Refund Policy" sections={REFUND_SECTIONS} />;
}
