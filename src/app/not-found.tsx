import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <Logo />
      <h1 className="title mt-8">We could not find that page</h1>
      <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-muted">
        The link may be old, or the piece may have sold out and been retired.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn btn-primary">
          Browse the collection
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </div>
  );
}
