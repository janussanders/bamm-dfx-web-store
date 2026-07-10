import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubmitUser } from "../hooks/useQueries";
import {
  DOWNLOAD_FORM_PRIVACY,
  DOWNLOAD_MODAL_DESCRIPTION,
  DOWNLOAD_MODAL_TITLE,
  TRIAL_ALREADY_ISSUED_SUPPORT,
  TRIAL_ALREADY_ISSUED_TITLE,
} from "../legal/marketing";

interface DownloadFormProps {
  onClose: () => void;
}

export default function DownloadForm({ onClose }: DownloadFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [alreadySubmittedEmail, setAlreadySubmittedEmail] = useState<
    string | null
  >(null);
  const navigate = useNavigate();
  const submitUser = useSubmitUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const result = await submitUser.mutateAsync({
        name: name.trim(),
        email: email.trim(),
      });
      if (result.__kind__ === "alreadySubmitted") {
        setAlreadySubmittedEmail(result.alreadySubmitted.email);
      } else {
        navigate({
          to: "/download-success",
          search: {
            email: email.trim(),
            name: name.trim(),
            returning: "false",
            new: "true",
          },
        });
        onClose();
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit. Please try again.");
    }
  };

  const handleAcknowledgeAndDownload = () => {
    if (alreadySubmittedEmail) {
      navigate({
        to: "/download-success",
        search: { email: alreadySubmittedEmail, returning: "true" },
      });
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{DOWNLOAD_MODAL_TITLE}</DialogTitle>
          <DialogDescription>{DOWNLOAD_MODAL_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        {alreadySubmittedEmail ? (
          <div className="space-y-6 py-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {TRIAL_ALREADY_ISSUED_TITLE}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A trial license has already been sent to{" "}
                <span className="font-semibold text-foreground">
                  {alreadySubmittedEmail}
                </span>
                . Check your inbox for the original email.
              </p>
              <p className="text-xs text-muted-foreground">
                {TRIAL_ALREADY_ISSUED_SUPPORT}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-ocid="download.cancel_button"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleAcknowledgeAndDownload}
                className="flex-1"
                data-ocid="download.acknowledge_download_button"
              >
                Acknowledge &amp; Download
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitUser.isPending}
                required
                data-ocid="download.name_input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitUser.isPending}
                required
                data-ocid="download.email_input"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitUser.isPending}
                className="flex-1"
                data-ocid="download.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitUser.isPending}
                className="flex-1"
                data-ocid="download.submit_button"
              >
                {submitUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {DOWNLOAD_FORM_PRIVACY} By continuing you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
