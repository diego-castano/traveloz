type Props = {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  videoUrl: string;
};

export function HomeHero({
  title,
  subtitle,
  ctaText,
  ctaLink,
  videoUrl,
}: Props) {
  return (
    <section className="hero-area relative">
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div className="container z-99">
        <div className="hero-inner text-sm-center text-start p_150">
          <h1 className="hero-text">{title}</h1>
          <h3 className="hero-sub-title">{subtitle}</h3>
          <a className="hero-btn" href={ctaLink}>
            {ctaText}
          </a>
        </div>
      </div>
    </section>
  );
}
