import { Link } from "@tanstack/react-router";
import type { LegalSection } from "../legal/copy";
import { EFFECTIVE_DATE, LEGAL_ENTITY, SUPPORT_EMAIL } from "../legal/copy";

type Props = {
  title: string;
  sections: LegalSection[];
};

export default function LegalDocumentPage({ title, sections }: Props) {
  return (
    <div className="container max-w-3xl py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {LEGAL_ENTITY} · Effective {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="border-t border-border/40 pt-6 text-sm text-muted-foreground space-y-2">
        <p>
          Questions?{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-primary hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>
          {" · "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/refunds" className="text-primary hover:underline">
            Refunds
          </Link>
          {" · "}
          <Link to="/" className="text-primary hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
