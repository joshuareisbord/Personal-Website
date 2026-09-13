import type { ReactElement } from 'react';
import type { Profile } from '../../lib/profile';
import type { SiteCopy } from '../../lib/content';
import { photoSource } from '../../lib/photo-source';
import { ProfilePhoto } from '../profile-photo';
interface AboutProps {
  profile: Profile;
  site: Pick<SiteCopy, 'aboutTitle' | 'about'>;
}
/** Display the authored biography and its optional cropped portrait. */
export function About({ profile, site }: AboutProps): ReactElement {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-8 grid gap-10 border-b border-rule py-20 sm:py-28 lg:grid-cols-[1fr_2fr] lg:gap-20"
    >
      <div>
        <h2
          id="about-heading"
          className="max-w-sm text-5xl leading-none font-semibold tracking-[-0.045em] sm:text-6xl"
        >
          {site.aboutTitle}
        </h2>
        {profile.photo && (
          <figure className="mt-10 w-full max-w-md lg:mt-16 lg:max-w-none">
            <ProfilePhoto
              src={photoSource(profile.photo.path)}
              alt={profile.photo.alt}
              crop={profile.photo.crop}
              className="grayscale"
              loading="lazy"
            />
            <figcaption className="mt-3 font-mono text-xs text-muted">{profile.name}</figcaption>
          </figure>
        )}
      </div>
      <div className="max-w-3xl space-y-7">
        {site.about.map((paragraph, index) => (
          <p
            key={index}
            className={
              index === 0
                ? 'text-2xl leading-[1.4] font-medium tracking-[-0.02em] sm:text-3xl'
                : 'max-w-[42rem] text-lg leading-relaxed text-muted'
            }
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
