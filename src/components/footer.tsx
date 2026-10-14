import Link from "next/link";
import { Logo } from "./logo";
import { SITE, telLink, whatsappLink } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-mist">
      <div className="shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo withTagline />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
            A small house of goods from Iwo, Osun State. We blend perfume first, and carry leather,
            footwear and clothing we would use ourselves.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-[13px]">
            <a href={whatsappLink("Hello Morena Collection, I have a question.")} className="link w-fit" target="_blank" rel="noreferrer">
              WhatsApp {SITE.whatsappDisplay}
            </a>
            <a href={telLink()} className="link w-fit">
              Call {SITE.phoneDisplay}
            </a>
          </div>
        </div>

        <FooterColumn
          title="Shop"
          links={[
            { href: "/shop", label: "Everything" },
            { href: "/shop/category/perfumes", label: "Perfume" },
            { href: "/shop/category/bags", label: "Bags" },
            { href: "/shop/category/shoes", label: "Shoes" },
            { href: "/shop/category/clothes", label: "Clothes" },
          ]}
        />

        <FooterColumn
          title="Help"
          links={[
            { href: "/track", label: "Track an order" },
            { href: "/about", label: "About Morena" },
            { href: "/about#delivery", label: "Delivery & returns" },
            { href: "/checkout", label: "Checkout" },
          ]}
        />

        <div>
          <h3 className="eyebrow text-muted">Studio</h3>
          <address className="mt-4 not-italic text-[13px] leading-relaxed text-ink-soft">
            {SITE.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p className="mt-3 text-[12.5px] text-muted">{SITE.hours}</p>
        </div>
      </div>

      <div className="hairline">
        <div className="shell flex flex-col gap-3 py-6 text-[11.5px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {SITE.brand}. All rights reserved.
          </p>
          <p className="flex flex-wrap items-center gap-x-2">
            <span>Prices shown in your local currency.</span>
            <span className="hidden md:inline">·</span>
            <span>
              Website by{" "}
              <a href="https://damcospace.com" className="link text-ink-soft" rel="noreferrer">
                {SITE.developer}
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="eyebrow text-muted">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="link text-ink-soft">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
