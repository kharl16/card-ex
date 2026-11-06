import { QuickLinksGrid } from "@/components/resources/QuickLinksGrid";
import type { IAMLink } from "@/types/resources";

const sample: IAMLink[] = [
  {
    id: "1",
    name: "E-Form and Online Pay-in",
    link: "https://signup.iam-worldwidecorp.com/",
    category: null,
    icon_url: null,
    is_active: true,
  } as IAMLink,
  {
    id: "2",
    name: "IAM AI Tools",
    link: "https://iamhypertools.lovable.app/",
    category: null,
    icon_url: null,
    is_active: true,
  } as IAMLink,
  {
    id: "3",
    name: "IAM School of Wisdom",
    link: "https://www.facebook.com/IAMSchoolofWisdom",
    category: null,
    icon_url: null,
    is_active: true,
  } as IAMLink,
  {
    id: "4",
    name: "IAM Worldwide Website",
    link: "https://www.iam-worldwide.com/",
    category: null,
    icon_url: null,
    is_active: true,
  } as IAMLink,
  {
    id: "5",
    name: "Member's Log-in",
    link: "https://login.iam-worldwidecorp.com/",
    category: null,
    icon_url: null,
    is_active: true,
  } as IAMLink,
];

export default function QuickLinksPreview() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="mb-4 text-lg font-semibold">Quick Links preview</h1>
      <QuickLinksGrid
        links={sample}
        favorites={new Set()}
        onToggleFavorite={(id) => console.log("favorite", id)}
        onLogEvent={(id, e) => console.log("event", id, e)}
      />
    </div>
  );
}
