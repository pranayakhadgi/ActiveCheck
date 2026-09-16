import { Separator } from "@/components/ui/separator";

/** Required on every page by DESIGN.md. */
export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[960px] px-4 pb-10">
      <Separator className="mb-4" />
      <p className="text-sm text-muted-foreground">
        Not investment advice. Source: SEC EDGAR N-PORT filings.
      </p>
    </footer>
  );
}
