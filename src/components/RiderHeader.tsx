interface RiderHeaderProps {
  coverUrl: string;
  avatarUrl: string;
  companyLogoUrl?: string;
  name?: string;
  title?: string;
}

export default function RiderHeader({ coverUrl, avatarUrl, companyLogoUrl, name, title }: RiderHeaderProps) {
  return (
    <div className="relative -mx-6 -mt-6 overflow-visible">
      {/* Cover image */}
      <div className="h-40 w-full overflow-hidden">
        <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
      </div>

      {/* Avatar + company logo group */}
      <div className="absolute left-4 bottom-0 translate-y-1/2 flex items-center gap-4">
        {/* Avatar container */}
        <div className="h-24 w-24 rounded-full border-4 border-background bg-background overflow-hidden shadow-lg">
          <img src={avatarUrl} alt="Rider" className="h-full w-full object-cover" />
        </div>

        {/* Company logo (optional) */}
        {companyLogoUrl && (
          <div className="h-16 w-24 rounded-xl border-4 border-background bg-background overflow-hidden shadow-lg flex items-center justify-center">
            <img src={companyLogoUrl} alt="Company logo" className="h-full w-full object-contain" />
          </div>
        )}
      </div>

      {/* Spacer to avoid clipping */}
      <div className="h-16" />

      {/* Optional text for name/title */}
      {(name || title) && (
        <div className="px-6 pb-4">
          {name && <h1 className="text-lg font-semibold leading-tight">{name}</h1>}
          {title && <p className="text-sm text-muted-foreground mt-1">{title}</p>}
        </div>
      )}
    </div>
  );
}
